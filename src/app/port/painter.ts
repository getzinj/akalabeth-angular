import type { IPerspectiveTables } from './perspective-tables';

// What the game asks the screen to draw with lines. The renderers (phase 6) implement it; until then
// the game runs without drawing and only the text it prints can be compared.

export interface IDungeonSlice {
  /** DIS: how many squares ahead */
  readonly distance: number;
  /** CENT: the tile ahead, without the monster */
  readonly center: number;
  /** LEFT and RIGH: the last digit of the tiles beside it */
  readonly left: number;
  readonly right: number;
  /** MC: the monster standing there, 0 for none */
  readonly monster: number;
  readonly tables: IPerspectiveTables;
}


export interface IPainter {
  paintOverworld(terrain: readonly (readonly number[])[], x: number, y: number): void;
  paintDungeonSlice(slice: IDungeonSlice): void;
}


export class NullPainter implements IPainter {
  public paintOverworld(): void {
  }


  public paintDungeonSlice(): void {
  }
}
