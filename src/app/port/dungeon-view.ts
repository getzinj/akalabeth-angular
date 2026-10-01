import { BasicNumber } from '../runtime/applesoft/basic-number';
import { BadSubscriptError } from './basic-errors';
import type { IGameContext } from './game-context';
import { MONSTER_NAMES } from './game-text';

// What the player sees down the corridor (listing lines 200-490), square by square until a wall.
// The drawing is the painter's; the monster names and CHEST! that go with it are printed here.

const lit: (text: string) => BasicNumber = BasicNumber.parse;
const WALL: number = 1;
const DOOR: number = 3;
const SECRET_DOOR: number = 4;
const CHEST: number = 5;
const MIMIC: number = 8;


export class DungeonView {
  constructor(private readonly game: IGameContext) {
  }


  public draw(): void {
    const { machine, state, painter } = this.game;
    let distance: number = 0;
    let blocked: boolean = false;

    machine.hgr();
    machine.hires.hcolor(3);

    while (!blocked) {
      const ahead: number = this.cell(state.x + (state.directionX * distance), state.y + (state.directionY * distance));
      const beside: number = this.cell(state.x + (state.directionX * distance) + state.directionY, state.y + (state.directionY * distance) - state.directionX);
      const other: number = this.cell(state.x + (state.directionX * distance) - state.directionY, state.y + (state.directionY * distance) + state.directionX);
      const monster: number = BasicNumber.of(ahead).over(lit('10')).int().toInteger();
      const center: number = ahead - (monster * 10);

      painter.paintDungeonSlice({
        distance,
        center,
        left: this.lastDigit(beside),
        right: this.lastDigit(other),
        monster,
        tables: state.tables,
      });

      blocked = (distance > 0) && ((center === WALL) || (center === DOOR) || (center === SECRET_DOOR));
      if (!blocked && (center === CHEST) && (distance > 0)) {
        this.printInverse('CHEST!', false);
      }
      if (monster >= 1) {
        this.printInverse((monster === MIMIC) ? 'CHEST!' : MONSTER_NAMES[monster], true);
      }
      distance = distance + 1;
    }
  }


  private printInverse(words: string, clearLine: boolean): void {
    const { machine } = this.game;

    machine.text.inverse();
    machine.text.print(words);
    if (clearLine) {
      machine.call(-868);
    }
    machine.text.crdo();
    machine.text.normal();
  }


  /** The last decimal digit of a tile, the way line 206 finds it: INT((T/10-INT(T/10))*10+.1). */
  private lastDigit(tile: number): number {
    const tenth: BasicNumber = BasicNumber.of(tile).over(lit('10'));

    return tenth.minus(BasicNumber.of(tile).over(lit('10')).int()).times(lit('10')).plus(lit('.1')).int().toInteger();
  }


  private cell(x: number, y: number): number {
    const squares: readonly (readonly number[])[] = this.game.state.dungeon.squares;

    if ((x < 0) || (x > 10) || (y < 0) || (y > 10)) {
      throw new BadSubscriptError();
    }

    return squares[x][y];
  }
}
