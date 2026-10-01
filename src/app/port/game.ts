import type { AppleMachine } from '../runtime/apple-machine';
import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import { restartsTheGame } from './basic-errors';
import { CharacterCreation } from './character-creation';
import { Combat } from './combat';
import { generateDungeonLevel } from './dungeon-generator';
import { DungeonView } from './dungeon-view';
import type { IGameContext } from './game-context';
import { GameState } from './game-state';
import { FOOD, GOLD, HIT_POINTS, ITEM_NAMES } from './game-text';
import { LordBritish } from './lord-british';
import { MonsterTurns } from './monster-turns';
import type { IPainter } from './painter';
import { NullPainter } from './painter';
import { Shop } from './shop';
import { TERRAIN_CASTLE, TERRAIN_DUNGEON, TERRAIN_MOUNTAIN, TERRAIN_TOWN, generateWorld } from './world-generator';

// The game itself (listing lines 0-1099 and 6000-6060): one loop of commands, each of which ends
// either by asking again or by letting a turn pass.

const lit: (text: string) => BasicNumber = BasicNumber.parse;
const n: (integer: number) => BasicNumber = BasicNumber.of;

const KEY_RETURN: number = 141;
const KEY_RIGHT: number = 149;
const KEY_LEFT: number = 136;
const KEY_SLASH: number = 175;
const KEY_X: number = 216;
const KEY_A: number = 193;
const KEY_ESCAPE: number = 155;
const KEY_SPACE: number = 160;
const KEY_S: number = 211;
const KEY_P: number = 208;

const TRAP: number = 2;
const CHEST: number = 5;
const LADDER_DOWN: number = 7;
const LADDER_UP: number = 8;
const LADDER_BOTH: number = 9;

type Outcome = 'again' | 'turn';


export class Game {
  public state: GameState = new GameState();

  public readonly random: ApplesoftRandom;

  constructor(
    private readonly machine: AppleMachine,
    private readonly painter: IPainter = new NullPainter(),
    random: ApplesoftRandom = new ApplesoftRandom(),
  ) {
    this.random = random;
  }


  /** Plays until the page is closed: dying and any error the original traps both start it over. */
  public async run(): Promise<void> {
    for (;;) {
      try {
        await this.playThrough();
      } catch (error) {
        if (!restartsTheGame(error)) {
          throw error;
        }
      }
    }
  }


  private get context(): IGameContext {
    return { machine: this.machine, state: this.state, random: this.random, painter: this.painter };
  }


  private async playThrough(): Promise<void> {
    const text: AppleMachine['text'] = this.machine.text;

    this.state = new GameState();
    await new CharacterCreation(this.machine, this.state, this.random).run();

    this.machine.textMode();
    text.home();
    text.normal();
    this.state.world = generateWorld(this.random, this.state.luckyNumber);
    this.state.overworldX = this.state.world.startX;
    this.state.overworldY = this.state.world.startY;

    text.home();
    this.machine.hires.hcolor(3);
    this.machine.poke(34, 20);
    this.machine.poke(33, 29);
    text.home();
    this.paintOverworld();

    let playing: boolean = true;

    while (playing) {
      const outcome: Outcome = await this.command();

      if (outcome === 'turn') {
        playing = await this.passTurn();
      }
    }
  }


  /** Lines 1000-1089. */
  private async command(): Promise<Outcome> {
    const { machine, state } = this;
    const text: AppleMachine['text'] = machine.text;
    const overworld: boolean = state.level === 0;
    let outcome: Outcome = 'turn';

    text.vtab(24);
    text.print('COMMAND? ');
    machine.call(-868);
    const key: number = await machine.keyboard.waitForKey();

    machine.poke(-16368, 0);

    if (key === KEY_RETURN) {
      outcome = overworld ? this.step('NORTH', 0, -1) : this.forward();
    } else if (key === KEY_RIGHT) {
      outcome = overworld ? this.step('EAST', 1, 0) : this.turn('TURN RIGHT', 1);
    } else if (key === KEY_LEFT) {
      outcome = overworld ? this.step('WEST', -1, 0) : this.turn('TURN LEFT', -1);
    } else if (key === KEY_SLASH) {
      outcome = overworld ? this.step('SOUTH', 0, 1) : this.turnAround();
    } else if (key === KEY_X) {
      outcome = overworld ? await this.enter() : this.climb();
    } else if ((key === KEY_A) || (key === KEY_ESCAPE)) {
      if (!overworld) {
        await new Combat(this.context).attack();
      }
    } else if (key === KEY_SPACE) {
      this.say('PASS');
    } else if (key === KEY_S) {
      await this.showStats();
    } else if ((key === KEY_P) && state.paused) {
      state.paused = false;
      this.say('PAUSE OFF');
      outcome = 'again';
    } else if (key === KEY_P) {
      state.paused = true;
      this.say('PAUSE ON');
      outcome = 'again';
    } else {
      this.say('HUH?');
      outcome = 'again';
    }

    return outcome;
  }


  /** Lines 1100-1410: a step across the overworld. */
  private step(name: string, dx: number, dy: number): Outcome {
    const { state } = this;

    this.say(name);
    if (state.world.terrain[state.overworldX + dx][state.overworldY + dy] === TERRAIN_MOUNTAIN) {
      this.say('YOU CAN\'T PASS THE MOUNTAINS');
    } else {
      state.overworldX = state.overworldX + dx;
      state.overworldY = state.overworldY + dy;
    }

    return 'turn';
  }


  /** Lines 1150-1190. */
  private forward(): Outcome {
    const { state } = this;
    const squares: number[][] = state.dungeon.squares;
    const ahead: number = squares[state.x + state.directionX][state.y + state.directionY];
    let treasure: BasicNumber = BasicNumber.ZERO;

    if ((ahead !== 1) && (ahead < 10)) {
      state.x = state.x + state.directionX;
      state.y = state.y + state.directionY;
    }
    this.say('FORWARD');

    if (squares[state.x][state.y] === TRAP) {
      this.say('AAARRRGGGHHH!!! A TRAP!');
      state.attributes[HIT_POINTS] = state.attributes[HIT_POINTS].minus(this.random.next().times(n(state.level)).plus(lit('3')).int()).stored();
      state.level = state.level + 1;
      this.say(`FALLING TO LEVEL ${ state.level }`);
      this.generateDungeon();
    } else {
      if (squares[state.x][state.y] === CHEST) {
        squares[state.x][state.y] = 0;
        this.say('GOLD!!!!!');
        treasure = this.random.next().times(lit('5')).times(n(state.level)).plus(n(state.level)).int().stored();
        this.say(`${ treasure.print() }-PIECES OF EIGHT`);
        state.attributes[GOLD] = state.attributes[GOLD].plus(treasure).stored();
      }
      if (treasure.isGreaterThan(BasicNumber.ZERO)) {
        const item: number = this.random.next().times(lit('6')).int().toInteger();

        this.say(`AND A ${ ITEM_NAMES[item] }`);
        state.possessions[item] = state.possessions[item].plus(lit('1')).stored();
      }
    }

    return 'turn';
  }


  private turn(name: string, direction: number): Outcome {
    const { state } = this;

    this.say(name);
    if (state.directionX !== 0) {
      state.directionY = direction * state.directionX;
      state.directionX = 0;
    } else {
      state.directionX = (direction === 1) ? 0 - state.directionY : state.directionY;
      state.directionY = 0;
    }

    return 'turn';
  }


  private turnAround(): Outcome {
    this.say('TURN AROUND');
    this.state.directionX = 0 - this.state.directionX;
    this.state.directionY = 0 - this.state.directionY;

    return 'turn';
  }


  /** Lines 1500-1520: X on the overworld enters whatever is under the player. */
  private async enter(): Promise<Outcome> {
    const { state } = this;
    const here: number = state.world.terrain[state.overworldX][state.overworldY];
    let outcome: Outcome = 'turn';

    if (here === TERRAIN_TOWN) {
      const shop: Shop = new Shop(this.machine, state);

      shop.draw();
      await shop.run();
    } else if (here === TERRAIN_DUNGEON) {
      this.say('GO DUNGEON');
      this.say('PLEASE WAIT ');
      state.level = 1;
      this.generateDungeon();
      state.directionX = 1;
      state.directionY = 0;
      state.x = 1;
      state.y = 1;
    } else if (here === TERRAIN_CASTLE) {
      await new LordBritish(this.context).visit();
    } else {
      this.say('HUH?');
      outcome = 'again';
    }

    return outcome;
  }


  /** Lines 1550-1587: X in the dungeon uses a ladder. */
  private climb(): Outcome {
    const { state } = this;
    const here: number = state.dungeon.squares[state.x][state.y];

    if ((here === LADDER_DOWN) || (here === LADDER_BOTH)) {
      this.say(`GO DOWN TO LEVEL ${ state.level + 1 }`);
      state.level = state.level + 1;
      this.generateDungeon();
    } else if (here === LADDER_UP) {
      if (state.level === 1) {
        this.say('LEAVE DUNGEON');
        state.level = 0;
      } else {
        this.say(`GO UP TO LEVEL ${ state.level - 1 }`);
        state.level = state.level - 1;
        this.generateDungeon();
      }
      if (state.level === 0) {
        this.say('THOU HAST GAINED');
        this.say(`${ state.loot } HIT POINTS`);
        state.attributes[HIT_POINTS] = state.attributes[HIT_POINTS].plus(n(state.loot)).stored();
        state.loot = 0;
      }
    } else {
      this.say('HUH?');
    }

    return 'turn';
  }


  /** Line 1700. */
  private async showStats(): Promise<void> {
    const text: AppleMachine['text'] = this.machine.text;

    new Shop(this.machine, this.state).draw();
    text.home();
    text.print('PRESS -CR- TO CONTINUE');
    await this.machine.input('?');
    this.machine.textMode();
    text.home();
  }


  /** Lines 1090-1098: food, then the monsters, then the new view. */
  private async passTurn(): Promise<boolean> {
    const { machine, state } = this;
    const text: AppleMachine['text'] = machine.text;
    let alive: boolean = true;

    state.possessions[FOOD] = state.possessions[FOOD].minus(lit('1')).plus(n(state.level).sgn().times(lit('.9'))).stored();

    if (state.possessions[FOOD].isLessThan(BasicNumber.ZERO)) {
      state.attributes[HIT_POINTS] = BasicNumber.ZERO;
      text.crdo();
      this.say('YOU HAVE STARVED!!!!!');
    } else {
      this.printStatus();
      state.possessions[FOOD] = state.possessions[FOOD].times(lit('10')).int().over(lit('10')).stored();
    }

    if (!this.isAlive() || ((state.level > 0) && !(await this.monstersMove()))) {
      await this.mourn();
      alive = false;
    } else {
      this.printStatus();
      if (state.level === 0) {
        this.paintOverworld();
      } else {
        new DungeonView(this.context).draw();
      }
    }

    return alive;
  }


  private async monstersMove(): Promise<boolean> {
    await new MonsterTurns(this.context).run();

    return this.isAlive();
  }


  private isAlive(): boolean {
    return this.state.attributes[HIT_POINTS].isGreaterThan(BasicNumber.ZERO);
  }


  private printStatus(): void {
    const { machine, state } = this;
    const text: AppleMachine['text'] = machine.text;
    const lines: [ number, string, string ][] = [
      [ 22, 'FOOD=', state.possessions[FOOD].print() ],
      [ 23, 'H.P.=', state.attributes[HIT_POINTS].print() ],
      [ 24, 'GOLD=', state.attributes[GOLD].print() ],
    ];

    machine.poke(33, 40);
    for (const [ row, label, value ] of lines) {
      text.vtab(row);
      text.htab(30);
      text.print(label + value);
      machine.call(-868);
    }
    machine.poke(33, 29);
    text.htab(1);
  }


  /** Lines 6000-6060: the player is dead, and ESC starts again. */
  private async mourn(): Promise<void> {
    const { machine, state } = this;
    const text: AppleMachine['text'] = machine.text;

    machine.poke(33, 40);
    text.crdo();
    text.crdo();
    this.say('        WE MOURN THE PASSING OF');
    if (state.playerName.length > 22) {
      state.playerName = '';
    }
    if (state.playerName === '') {
      state.playerName = 'THE PEASANT';
    }
    state.playerName = `${ state.playerName } AND HIS COMPUTER`;
    text.htab(20 - Math.floor(state.playerName.length / 2));
    this.say(state.playerName);
    this.say('  TO INVOKE A MIRACLE OF RESSURECTION');
    text.print('             <HIT ESC KEY>');

    let code: number = machine.peek(-16384);

    while (code !== KEY_ESCAPE) {
      code = await machine.keyboard.nextPress();
    }
  }


  private generateDungeon(): void {
    const { state } = this;

    generateDungeonLevel(this.random, {
      lucky: state.luckyNumber,
      squareX: state.overworldX,
      squareY: state.overworldY,
      level: state.level,
      playerX: state.x,
      playerY: state.y,
      levelOfPlay: state.levelOfPlay,
    }, state.dungeon);
  }


  private paintOverworld(): void {
    const { machine, state } = this;

    machine.hgr();
    this.painter.paintOverworld(state.world.terrain, state.overworldX, state.overworldY);
  }


  private say(words: string): void {
    this.machine.text.print(words);
    this.machine.text.crdo();
  }
}
