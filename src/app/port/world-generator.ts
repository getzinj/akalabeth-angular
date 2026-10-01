import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';

// The overworld (listing lines 8 and 30-50): a 21x21 grid with a mountain wall round the edge,
// terrain rolled square by square, one castle and one town.

export const TERRAIN_GRASS: number = 0;
export const TERRAIN_MOUNTAIN: number = 1;
export const TERRAIN_TREES: number = 2;
export const TERRAIN_TOWN: number = 3;
export const TERRAIN_DUNGEON: number = 4;
export const TERRAIN_CASTLE: number = 5;

export const WORLD_SIZE: number = 21;

export interface IWorld {
  /** TE%(X,Y), indexed [x][y]. */
  readonly terrain: number[][];
  /** Where the player starts, which is also where the town is (TX and TY). */
  readonly startX: number;
  readonly startY: number;
}


const lit: (text: string) => BasicNumber = BasicNumber.parse;


export function seedFromLuckyNumber(random: ApplesoftRandom, lucky: BasicNumber): void {
  random.rnd(lucky.abs().negated());
}


/** One INT(RND(1)*19+1) in 1..19. */
function rollSquare(random: ApplesoftRandom): number {
  return random.next().times(lit('19')).plus(lit('1')).int().toSubscript();
}


export function generateWorld(random: ApplesoftRandom, lucky: BasicNumber): IWorld {
  const terrain: number[][] = Array.from({ length: WORLD_SIZE }, (): number[] => new Array<number>(WORLD_SIZE).fill(0));

  seedFromLuckyNumber(random, lucky);

  for (let x: number = 0; x <= 20; x++) {
    terrain[x][0] = TERRAIN_MOUNTAIN;
    terrain[0][x] = TERRAIN_MOUNTAIN;
    terrain[x][20] = TERRAIN_MOUNTAIN;
    terrain[20][x] = TERRAIN_MOUNTAIN;
  }

  for (let x: number = 1; x <= 19; x++) {
    for (let y: number = 1; y <= 19; y++) {
      terrain[x][y] = random.next().toThe(lit('5')).times(lit('4.5')).int().toInteger();

      // Applesoft evaluates both sides of AND, so the coin is tossed whatever the terrain.
      const isTown: boolean = terrain[x][y] === TERRAIN_TOWN;
      const heads: boolean = random.next().isGreaterThan(lit('.5'));

      if (isTown && heads) {
        terrain[x][y] = TERRAIN_GRASS;
      }
    }
  }

  const castleX: number = rollSquare(random);
  const castleY: number = rollSquare(random);

  terrain[castleX][castleY] = TERRAIN_CASTLE;

  const startX: number = rollSquare(random);
  const startY: number = rollSquare(random);

  terrain[startX][startY] = TERRAIN_TOWN;

  return { terrain, startX, startY };
}
