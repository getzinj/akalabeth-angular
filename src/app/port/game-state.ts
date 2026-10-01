import { BasicNumber } from '../runtime/applesoft/basic-number';
import type { IDungeonLevel } from './dungeon-generator';
import { emptyDungeonLevel } from './dungeon-generator';
import type { IPerspectiveTables } from './perspective-tables';
import { buildPerspectiveTables } from './perspective-tables';
import type { IWorld } from './world-generator';

// The listing's variables, under names that say what they hold. Real arrays hold BasicNumbers
// because Applesoft's reals are not doubles; integer variables are plain numbers.

export class GameState {
  /** LN */
  public luckyNumber: BasicNumber = BasicNumber.ZERO;

  /** LP, 1 to 10 */
  public levelOfPlay: number = 1;

  /** PT$: 'F' or 'M' */
  public playerClass: string = '';

  /** C(0) to C(5): hit points, strength, dexterity, stamina, wisdom, gold */
  public readonly attributes: BasicNumber[] = new Array<BasicNumber>(6).fill(BasicNumber.ZERO);

  /** PW(0) to PW(5): food, rapiers, axes, shields, bows, amulets */
  public readonly possessions: BasicNumber[] = new Array<BasicNumber>(6).fill(BasicNumber.ZERO);

  /** TE%(X,Y) and the starting town */
  public world: IWorld = { terrain: [], startX: 0, startY: 0 };

  /** XX%, YY%, PER%, LD%, CD%, FT% and LAD% */
  public readonly tables: IPerspectiveTables = buildPerspectiveTables();

  /** TX and TY: the square on the overworld */
  public overworldX: number = 0;
  public overworldY: number = 0;

  /** INOUT and IN: 0 on the overworld, otherwise the dungeon level */
  public level: number = 0;

  /** DNG%(X,Y), ML%, MZ% and NM */
  public dungeon: IDungeonLevel = emptyDungeonLevel();

  /** PX and PY: the square in the dungeon, and DX and DY: the way the player faces */
  public x: number = 0;
  public y: number = 0;
  public directionX: number = 0;
  public directionY: number = 0;

  /** LK: hit points earned in this dungeon, paid out on climbing out */
  public loot: number = 0;

  /** TASK: the monster number Lord British asked for, negated once it is hit */
  public task: number = 0;

  /** PN$ */
  public playerName: string = '';

  /** PA: the pause option */
  public paused: boolean = false;
}
