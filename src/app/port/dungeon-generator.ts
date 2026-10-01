import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';

// A dungeon level (listing lines 500-590 and 2000-2090). Line 520 also writes DNG(Y,X), without
// the % that would make it the DNG%() array; that is a separate array nothing reads, so it is not
// reproduced.

export const DUNGEON_SIZE: number = 11;
export const MONSTER_SLOTS: number = 11;

export interface IDungeonLevel {
  /** DNG%(X,Y), indexed [x][y]. */
  readonly squares: number[][];
  /** ML%(X,0) and ML%(X,1): where monster X was last placed, which is stale when it was not. */
  readonly monsterAt: number[][];
  /** MZ%(X,0): 1 while monster X is alive; MZ%(X,1): its hit points. */
  readonly monster: number[][];
  count: number;
}


export interface IDungeonRequest {
  readonly lucky: BasicNumber;
  /** TX and TY: the overworld square the dungeon is entered from. */
  readonly squareX: number;
  readonly squareY: number;
  /** INOUT: the level, 1 to 10. */
  readonly level: number;
  /** PX and PY: where the player stands, which no monster may be placed on. */
  readonly playerX: number;
  readonly playerY: number;
  /** LP: the level of play, 1 to 10. */
  readonly levelOfPlay: number;
}


const n: (integer: number) => BasicNumber = BasicNumber.of;
const lit: (text: string) => BasicNumber = BasicNumber.parse;


export function emptyDungeonLevel(): IDungeonLevel {
  return {
    squares: Array.from({ length: DUNGEON_SIZE }, (): number[] => new Array<number>(DUNGEON_SIZE).fill(0)),
    monsterAt: Array.from({ length: MONSTER_SLOTS }, (): number[] => [ 0, 0 ]),
    monster: Array.from({ length: MONSTER_SLOTS }, (): number[] => [ 0, 0 ]),
    count: 0,
  };
}


export function generateDungeonLevel(random: ApplesoftRandom, request: IDungeonRequest, dungeon: IDungeonLevel): void {
  const level: number = request.level;
  const seed: BasicNumber = request.lucky.abs().negated()
    .minus(n(request.squareX).times(lit('10')))
    .minus(n(request.squareY).times(lit('1000')))
    .plus(n(level).times(lit('31.4')));

  random.rnd(seed);

  for (let x: number = 1; x <= 9; x++) {
    for (let y: number = 1; y <= 9; y++) {
      dungeon.squares[x][y] = 0;
    }
  }

  for (let x: number = 0; x <= 10; x++) {
    dungeon.squares[x][0] = 1;
    dungeon.squares[x][10] = 1;
    dungeon.squares[0][x] = 1;
    dungeon.squares[10][x] = 1;
  }

  for (let x: number = 2; x <= 8; x = x + 2) {
    for (let y: number = 1; y <= 9; y++) {
      dungeon.squares[x][y] = 1;
    }
  }

  placeFeatures(random, dungeon);
  placeLaddersAndHoles(level, dungeon);
  placeMonsters(random, request, dungeon);
}


function chance(random: ApplesoftRandom, threshold: string): boolean {
  return random.next().isGreaterThan(lit(threshold));
}


const FEATURE_ROLLS: readonly [ string, number, boolean ][] = [
  [ '.95', 2, false ], [ '.95', 2, true ],
  [ '.6', 3, true ], [ '.6', 3, false ],
  [ '.6', 4, false ], [ '.6', 4, true ],
  [ '.97', 9, true ], [ '.97', 9, false ],
  [ '.94', 5, false ], [ '.94', 5, true ],
];


/** Lines 530-568: ten rolls for each pair of mirrored squares in the even rows and columns. */
function placeFeatures(random: ApplesoftRandom, dungeon: IDungeonLevel): void {
  const squares: number[][] = dungeon.squares;

  for (let x: number = 2; x <= 8; x = x + 2) {
    for (let y: number = 1; y <= 9; y = y + 2) {
      for (const [ threshold, value, swapped ] of FEATURE_ROLLS) {
        if (chance(random, threshold)) {
          if (swapped) {
            squares[y][x] = value;
          } else {
            squares[x][y] = value;
          }
        }
      }
    }
  }
}


/** Lines 569-580: squares 7 and 8 trade places on alternate levels, and level 1 is special. */
function placeLaddersAndHoles(level: number, dungeon: IDungeonLevel): void {
  const squares: number[][] = dungeon.squares;
  const isEven: boolean = (level % 2) === 0;

  squares[2][1] = 0;

  if (isEven) {
    squares[7][3] = 7;
    squares[3][7] = 8;
  } else {
    squares[7][3] = 8;
    squares[3][7] = 7;
  }

  if (level === 1) {
    squares[1][1] = 8;
    squares[7][3] = 0;
  }
}


/** Lines 2000-2090. */
function placeMonsters(random: ApplesoftRandom, request: IDungeonRequest, dungeon: IDungeonLevel): void {
  dungeon.count = 0;

  for (let x: number = 1; x <= 10; x++) {
    dungeon.monster[x][0] = 0;
    dungeon.monster[x][1] = x + 3 + request.level;

    // Both sides of the OR are evaluated, so the roll is spent even for monsters too deep for this level.
    const tooDeep: boolean = (x - 2) > request.level;
    const skipped: boolean = chance(random, '.4');

    if (!tooDeep && !skipped) {
      placeMonster(random, request, dungeon, x);
    }
  }
}


function placeMonster(random: ApplesoftRandom, request: IDungeonRequest, dungeon: IDungeonLevel, monster: number): void {
  const at: number[] = dungeon.monsterAt[monster];
  let free: boolean = false;

  while (!free) {
    at[0] = random.next().times(lit('9')).plus(lit('1')).int().toSubscript();
    at[1] = random.next().times(lit('9')).plus(lit('1')).int().toSubscript();
    free = (dungeon.squares[at[0]][at[1]] === 0) && !((at[0] === request.playerX) && (at[1] === request.playerY));
  }

  dungeon.squares[at[0]][at[1]] = monster * 10;
  dungeon.monster[monster][0] = 1;
  dungeon.count = dungeon.count + 1;
  dungeon.monster[monster][1] = monster * 2 + request.level * 2 * request.levelOfPlay;
}
