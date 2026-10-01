import { BasicNumber } from '../runtime/applesoft/basic-number';
import { StuckError } from './basic-errors';
import type { IGameContext } from './game-context';
import { HIT_POINTS, ITEM_NAMES, MONSTER_NAMES } from './game-text';

// What the monsters do after each move in the dungeon (listing lines 4000-4999): the living ones
// close in, or run when they are hurt, and attack, steal or wait.

const lit: (text: string) => BasicNumber = BasicNumber.parse;
const n: (integer: number) => BasicNumber = BasicNumber.of;
const THIEF: number = 2;
const GREMLIN: number = 7;
const MIMIC: number = 8;
const FOOD: number = 0;
const SHIELD: number = 3;
const STAMINA: number = 3;
const STEAL_ATTEMPTS: number = 100000;


export class MonsterTurns {
  constructor(private readonly game: IGameContext) {
  }


  public async run(): Promise<void> {
    for (let monster: number = 1; monster <= 10; monster++) {
      if (this.game.state.dungeon.monster[monster][0] !== 0) {
        await this.act(monster);
      }
    }
  }


  private async act(monster: number): Promise<void> {
    const { state } = this.game;
    const at: number[] = state.dungeon.monsterAt[monster];
    const range: BasicNumber = n(state.x - at[0]).toThe(lit('2')).plus(n(state.y - at[1]).toThe(lit('2'))).sqr();
    const hurt: boolean = state.dungeon.monster[monster][1] < (state.level * state.levelOfPlay);
    const near: boolean = range.isLessThan(lit('1.3'));
    const waits: boolean = (monster === MIMIC) && range.isLessThan(lit('3'));

    if (!hurt && near) {
      await this.attack(monster);
    } else if (hurt || !waits) {
      await this.approach(monster, hurt, near);
    }
  }


  /** Lines 4030-4499: step towards the player, or away when hurt. */
  private async approach(monster: number, hurt: boolean, near: boolean): Promise<void> {
    const { state } = this.game;
    const dungeon: typeof state.dungeon = state.dungeon;
    const at: number[] = dungeon.monsterAt[monster];
    const flip: number = hurt ? -1 : 1;
    let stepX: number = Math.sign(state.x - at[0]) * flip;
    let stepY: number = Math.sign(state.y - at[1]) * flip;
    let moves: boolean = true;
    let stays: boolean = false;

    if ((stepY !== 0) && this.passable(at[0], at[1] + stepY)) {
      stepX = 0;
    } else {
      stepY = 0;
      if ((stepX !== 0) && !this.passable(at[0] + stepX, at[1])) {
        stepX = 0;
        moves = false;
      }
    }

    if (moves) {
      dungeon.squares[at[0]][at[1]] = dungeon.squares[at[0]][at[1]] - (10 * monster);
      if (((at[0] + stepX) === state.x) && ((at[1] + stepY) === state.y)) {
        stays = true;
      } else {
        at[0] = at[0] + stepX;
        at[1] = at[1] + stepY;
        dungeon.squares[at[0]][at[1]] = dungeon.squares[at[0]][at[1]] + (10 * monster);
      }
    }

    if (!stays && (stepX === 0) && (stepY === 0)) {
      if (hurt && near) {
        await this.attack(monster);
      } else if (hurt) {
        dungeon.monster[monster][1] = dungeon.monster[monster][1] + monster + state.level;
      }
    }
  }


  private passable(x: number, y: number): boolean {
    const tile: number = this.game.state.dungeon.squares[x][y];

    return !((tile === 1) || (tile > 9) || (tile === 2));
  }


  /** Lines 4500-4630. */
  private async attack(monster: number): Promise<void> {
    const { machine, state, random } = this.game;
    const text: typeof machine.text = machine.text;
    let attacks: boolean = true;

    if (((monster === THIEF) || (monster === GREMLIN)) && !random.next().isLessThan(lit('.5'))) {
      attacks = false;
      if (monster === GREMLIN) {
        state.possessions[FOOD] = state.possessions[FOOD].over(lit('2')).int().stored();
        this.say('A GREMLIN STOLE SOME FOOD');
      } else {
        this.steal();
      }
    }

    if (attacks) {
      this.say('YOU ARE BEING ATTACKED');
      this.say(`BY A ${ MONSTER_NAMES[monster] }`);

      const misses: boolean = random.next().times(lit('20')).minus(state.possessions[SHIELD].sgn()).minus(state.attributes[STAMINA])
        .plus(n(monster)).plus(n(state.level)).isLessThan(BasicNumber.ZERO);

      if (misses) {
        this.say('MISSED');
      } else {
        this.say('HIT');
        state.attributes[HIT_POINTS] = state.attributes[HIT_POINTS].minus(random.next().times(n(monster)).plus(n(state.level)).int()).stored();
      }
    }

    if (state.paused) {
      text.print('-CR- TO CONT. ');
      await machine.input('?');
    }
  }


  private steal(): void {
    const { state, random } = this.game;
    let item: number = random.next().times(lit('6')).int().toSubscript();
    let attempts: number = 0;

    while (state.possessions[item].isLessThan(lit('1'))) {
      attempts = attempts + 1;
      if (attempts > STEAL_ATTEMPTS) {
        throw new StuckError();
      }
      item = random.next().times(lit('6')).int().toSubscript();
    }
    this.say(`A THIEF STOLE A ${ ITEM_NAMES[item] }`);
    state.possessions[item] = state.possessions[item].minus(lit('1')).stored();
  }


  private say(words: string): void {
    this.game.machine.text.print(words);
    this.game.machine.text.crdo();
  }
}
