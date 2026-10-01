import { BasicNumber } from '../runtime/applesoft/basic-number';
import type { IGameContext } from './game-context';
import { GOLD, HIT_POINTS, MONSTER_NAMES } from './game-text';

// Attacking (listing lines 1650-1697): a weapon, the amulet's four gifts, and what a hit earns.

const lit: (text: string) => BasicNumber = BasicNumber.parse;
const n: (integer: number) => BasicNumber = BasicNumber.of;
const AXE: number = 5;
const BOW: number = 4;
const STRENGTH: number = 1;
const DEXTERITY: number = 2;
const LADDER_DOWN: number = 7;
const LADDER_UP: number = 8;

interface IWeapon {
  readonly key: string;
  readonly name: string;
  readonly damage: number;
  readonly slot: number;
}

const WEAPONS: readonly IWeapon[] = [
  { key: 'R', name: 'RAPIER', damage: 10, slot: 1 },
  { key: 'A', name: 'AXE', damage: 5, slot: 2 },
  { key: 'S', name: 'SHIELD', damage: 1, slot: 3 },
  { key: 'B', name: 'BOW', damage: 4, slot: 4 },
];


export class Combat {
  /** MN: the monster being attacked */
  private target: number = 0;

  /** DAM */
  private damage: BasicNumber = BasicNumber.ZERO;

  constructor(private readonly game: IGameContext) {
  }


  public async attack(): Promise<void> {
    const { machine, state } = this.game;
    let chosen: boolean = false;

    while (!chosen) {
      this.target = 0;
      this.damage = BasicNumber.ZERO;
      this.say('ATTACK');
      machine.text.print('WHICH WEAPON ');
      const key: string = await machine.keyboard.get();
      const weapon: IWeapon | undefined = WEAPONS.find((candidate: IWeapon): boolean => candidate.key === key);

      if (weapon != null) {
        this.damage = lit(String(weapon.damage)).stored();
        this.say(weapon.name);
        if (state.possessions[weapon.slot].isLessThan(lit('1'))) {
          this.say('NOT OWNED');
        } else if ((state.playerClass === 'M') && (weapon.key === 'B')) {
          this.say('MAGES CAN\'T USE BOWS!');
        } else if ((state.playerClass === 'M') && (weapon.key === 'R')) {
          this.say('MAGES CAN\'T USE RAPIERS!');
        } else {
          chosen = true;
          await this.useWeapon(weapon.damage);
        }
      } else if (key === 'M') {
        this.say('MAGIC AMULET');
        chosen = await this.useAmulet();
      } else {
        this.say('HANDS');
        chosen = true;
        await this.melee();
      }
    }
  }


  private async useWeapon(damage: number): Promise<void> {
    if ((damage === AXE) || (damage === BOW)) {
      await this.ranged(damage);
    } else {
      await this.melee();
    }
  }


  /** Lines 1661-1662. */
  private async melee(): Promise<void> {
    const { state } = this.game;

    this.target = n(state.dungeon.squares[state.x + state.directionX][state.y + state.directionY]).over(lit('10')).int().toInteger();
    await this.resolve();
  }


  /** Lines 1670-1674. */
  private async ranged(damage: number): Promise<void> {
    const { machine, state } = this.game;
    let swung: boolean = false;

    if (damage === AXE) {
      machine.text.print('TO THROW OR SWING:');
      const answer: string = await machine.keyboard.get();

      if (answer === 'T') {
        this.say('THROW');
        state.possessions[2] = state.possessions[2].minus(lit('1')).stored();
      } else {
        this.say('SWING');
        swung = true;
      }
    }

    if (swung) {
      await this.melee();
    } else {
      this.shoot();
      await this.resolve();
    }
  }


  /** Lines 1672-1674: the first monster in the next five squares ahead, walls or not. */
  private shoot(): void {
    const { state } = this.game;
    let distance: number = 1;
    let found: boolean = false;

    while (!found && (distance <= 5)) {
      const x: number = state.x + (state.directionX * distance);
      const y: number = state.y + (state.directionY * distance);

      if ((x < 1) || (x > 9) || (y > 9) || (y < 0)) {
        found = true;
      } else {
        this.target = n(state.dungeon.squares[x][y]).over(lit('10')).int().toInteger();
        found = this.target > 0;
      }
      distance = distance + 1;
    }
  }


  /** Lines 1662-1669. */
  private async resolve(): Promise<void> {
    const { machine, state, random } = this.game;
    const dungeon: typeof state.dungeon = state.dungeon;
    const dodged: boolean = state.attributes[DEXTERITY].minus(random.next().times(lit('25'))).isLessThan(n(this.target).plus(n(state.level)));
    const missed: boolean = (this.target < 1) || dodged;

    if (missed) {
      this.say('YOU MISSED');
    } else {
      this.say('HIT!!! ');
      this.damage = random.next().times(this.damage).plus(state.attributes[STRENGTH].over(lit('5'))).stored();
      dungeon.monster[this.target][1] = n(dungeon.monster[this.target][1]).minus(this.damage).toInteger();
      this.say(`${ MONSTER_NAMES[this.target] }'S HIT POINTS=${ dungeon.monster[this.target][1] }`);

      if (dungeon.monster[this.target][1] < 1) {
        const reward: number = this.target + state.level;
        const at: number[] = dungeon.monsterAt[this.target];

        this.say(`THOU HAST KILLED A ${ MONSTER_NAMES[this.target] }`);
        this.say('THOU SHALT RECEIVE');
        this.say(`${ reward } PIECES OF EIGHT`);
        state.attributes[GOLD] = state.attributes[GOLD].plus(n(reward)).int().stored();
        dungeon.squares[at[0]][at[1]] = dungeon.squares[at[0]][at[1]] - (10 * this.target);
        dungeon.monster[this.target][0] = 0;
      }

      state.loot = state.loot + Math.floor((this.target * state.level) / 2);
      if (this.target === state.task) {
        state.task = -state.task;
      }
    }

    if (state.paused) {
      machine.text.print('-CR- TO CONT. ');
      await machine.input('?');
    }
  }


  /** Lines 1680-1697. Returns false when the player owns no amulet and must choose again. */
  private async useAmulet(): Promise<boolean> {
    const { state, random } = this.game;
    let owned: boolean = true;
    let gift: number = 0;

    if (state.possessions[5].isLessThan(lit('1'))) {
      this.say('NONE OWNED');
      owned = false;
    } else if (state.playerClass === 'F') {
      gift = random.next().times(lit('4')).plus(lit('1')).int().toInteger();
    } else {
      gift = await this.askForGift();
      if (random.next().isGreaterThan(lit('.75'))) {
        this.say('LAST CHARGE ON THIS AMULET!');
        state.possessions[5] = state.possessions[5].minus(lit('1')).stored();
      }
    }

    if (owned) {
      await this.giveGift(gift);
    }

    return owned;
  }


  private async askForGift(): Promise<number> {
    const { machine } = this.game;
    const text: typeof machine.text = machine.text;
    let gift: BasicNumber = BasicNumber.ZERO;

    do {
      text.print('1-LADDER-UP');
      text.comma();
      text.print('2-LADDER-DN');
      text.crdo();
      text.print('3-KILL');
      text.comma();
      text.print('4-BAD??');
      text.crdo();
      text.print('CHOICE ');
      const key: string = await machine.keyboard.get();

      gift = BasicNumber.val(key);
      this.say(gift.print());
    } while (gift.isLessThan(lit('1')) || gift.isGreaterThan(lit('4')));

    return gift.toInteger();
  }


  private async giveGift(gift: number): Promise<void> {
    const { state, random } = this.game;
    const here: number[] = [ state.x, state.y ];

    if (gift === 1) {
      this.say('LADDER UP');
      state.dungeon.squares[here[0]][here[1]] = LADDER_UP;
    } else if (gift === 2) {
      this.say('LADDER DOWN');
      state.dungeon.squares[here[0]][here[1]] = LADDER_DOWN;
    } else if (gift === 3) {
      this.say('MAGIC ATTACK');
      this.damage = n(10).plus(n(state.level)).stored();
      this.target = 0;
      this.shoot();
      await this.resolve();
    } else {
      const outcome: number = random.next().times(lit('3')).plus(lit('1')).int().toInteger();

      if (outcome === 1) {
        this.say('YOU HAVE BEEN TURNED');
        this.say('INTO A TOAD!');
        for (let attribute: number = 1; attribute <= 4; attribute++) {
          state.attributes[attribute] = lit('3').stored();
        }
      } else if (outcome === 2) {
        this.say('YOU HAVE BEEN TURNED');
        this.say('INTO A LIZARD MAN');
        for (let attribute: number = 0; attribute <= 4; attribute++) {
          state.attributes[attribute] = state.attributes[attribute].times(lit('2.5')).int().stored();
        }
      } else {
        this.say('BACKFIRE');
        state.attributes[HIT_POINTS] = state.attributes[HIT_POINTS].over(lit('2')).stored();
      }
    }
  }


  private say(words: string): void {
    this.game.machine.text.print(words);
    this.game.machine.text.crdo();
  }
}
