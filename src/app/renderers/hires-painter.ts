import { IllegalQuantityError } from '../runtime/applesoft-errors';
import type { IBasicEnvironment } from '../runtime/applesoft/basic-expression';
import { evaluateExpression, normalizedName } from '../runtime/applesoft/basic-expression';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import type { HiresScreen } from '../runtime/hires-screen';
import type { IDungeonSlice, IPainter } from '../port/painter';
import type { IPerspectiveTables } from '../port/perspective-tables';
import { DRAWING_LINES } from './drawing-programs';

// The line drawing (listing lines 100-190, 200-252 and 300-400, with 3087-3089): the overworld's
// three-by-three view, the corridor's walls, doors, ladders and chests, and the ten monsters. The
// coordinates are the program's own expressions, evaluated in its own arithmetic and plotted with
// HPLOT's truncation and range checks; the conditions around them are ported here.

const WIDTH: number = 280;
const HEIGHT: number = 192;
const WALLS: readonly number[] = [ 1, 3, 4 ];
const MONSTER_LINES: readonly (readonly number[])[] = [
  [],
  [ 300, 301, 302, 303, 304, 305 ],
  [ 310, 311, 312 ],
  [ 320, 321, 322, 323 ],
  [ 330, 331, 332, 333, 334, 335, 336 ],
  [ 340, 341, 342, 343, 344, 345, 346 ],
  [ 350, 351, 352, 353, 354, 355 ],
  [ 360, 361, 362 ],
  [ 370, 371, 372 ],
  [ 380, 381, 382, 383, 384, 385, 386, 3087, 3088, 3089 ],
  [ 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400 ],
];

const n: (integer: number) => BasicNumber = BasicNumber.of;


class DrawingEnvironment implements IBasicEnvironment {
  private readonly variables: Map<string, BasicNumber> = new Map<string, BasicNumber>();

  constructor(private readonly tables: IPerspectiveTables | null) {
  }


  public set(name: string, value: BasicNumber): void {
    this.variables.set(normalizedName(name), value.stored());
  }


  public variable(name: string): BasicNumber {
    return this.variables.get(name) ?? BasicNumber.ZERO;
  }


  public element(name: string, subscripts: readonly number[]): BasicNumber {
    const tables: IPerspectiveTables | null = this.tables;
    let value: number | undefined;

    if (tables != null) {
      const arrays: Record<string, readonly (number | readonly number[])[]> = {
        'XX%': tables.XX, 'YY%': tables.YY, 'PE%': tables.PER, 'LD%': tables.LD, 'CD%': tables.CD, 'FT%': tables.FT, 'LA%': tables.LAD,
      };
      const row: number | readonly number[] | undefined = arrays[name]?.[subscripts[0]];

      value = (typeof row === 'number') ? row : row?.[subscripts[1]];
    }
    if (value == null) {
      throw new IllegalQuantityError(name, subscripts[0]);
    }

    return n(value);
  }
}


export class HiresPainter implements IPainter {
  constructor(private readonly hires: HiresScreen) {
  }


  /** Lines 100-190, after the HGR. */
  public paintOverworld(terrain: readonly (readonly number[])[], x: number, y: number): void {
    for (let dy: number = -1; dy <= 1; dy++) {
      for (let dx: number = -1; dx <= 1; dx++) {
        const environment: DrawingEnvironment = new DrawingEnvironment(null);
        const square: number = terrain[x + dx][y + dy];

        environment.set('X1', n(65 + ((dx + 1) * 50)));
        environment.set('Y1', n((dy + 1) * 50));
        this.run(105, environment);

        if (square === 2) {
          this.run(120, environment);
        } else if (square === 3) {
          this.run(130, environment);
        } else if (square === 4) {
          this.run(140, environment);
        } else if (square === 5) {
          this.run(150, environment);
        } else if (square === 1) {
          this.run(160, environment);
          this.run(170, environment);
        }
      }
    }
  }


  /** Lines 208-252 and 260-490: one square of the corridor, and the monster standing in it. */
  public paintDungeonSlice(slice: IDungeonSlice): void {
    const environment: DrawingEnvironment = new DrawingEnvironment(slice.tables);
    const distance: number = slice.distance;
    const { PER } = slice.tables;
    let seesPast: boolean = true;

    environment.set('DI', n(distance));
    (['L1', 'R1', 'T1', 'B1'] as const).forEach((name: string, index: number): void => environment.set(name, n(PER[distance][index])));
    (['L2', 'R2', 'T2', 'B2'] as const).forEach((name: string, index: number): void => environment.set(name, n(PER[distance + 1][index])));

    if (distance !== 0) {
      if (WALLS.includes(slice.center)) {
        this.run(210, environment);
      }
      if ((slice.center === 1) || (slice.center === 3)) {
        seesPast = false;
      } else if (slice.center === 4) {
        this.run(214, environment);
        seesPast = false;
      }
    }

    if (seesPast) {
      this.paintSides(slice, environment);
      this.paintFloorAndCeiling(slice, environment);
    }

    if ((slice.monster >= 1) && (distance !== 0)) {
      environment.set('B', n(79 + slice.tables.YY[distance]));
      environment.set('C', n(139));
      for (const line of MONSTER_LINES[slice.monster]) {
        this.run(line, environment);
      }
    }
  }


  private paintSides(slice: IDungeonSlice, environment: DrawingEnvironment): void {
    const { left, right, distance } = slice;
    const leftWall: boolean = WALLS.includes(left);
    const rightWall: boolean = WALLS.includes(right);

    if (leftWall) {
      this.run(216, environment);
    }
    if (rightWall) {
      this.run(218, environment);
    }
    if ((left === 4) && (distance > 0)) {
      this.run(220, environment);
    } else if (left === 4) {
      this.run(222, environment);
    }
    if ((right === 4) && (distance > 0)) {
      this.run(224, environment);
    } else if (right === 4) {
      this.run(226, environment);
    }
    if (!leftWall) {
      if (distance !== 0) {
        this.run(230, environment);
      }
      this.run(232, environment);
    }
    if (!rightWall) {
      if (distance !== 0) {
        this.run(236, environment);
      }
      this.run(238, environment);
    }
  }


  private paintFloorAndCeiling(slice: IDungeonSlice, environment: DrawingEnvironment): void {
    const { center, distance } = slice;
    const ladder: boolean = (center === 7) || (center === 8);

    if ((center === 7) || (center === 9)) {
      this.run(240, environment);
    }
    if (center === 8) {
      this.run(242, environment);
    }
    if (ladder) {
      this.run(244, environment);
      this.run(246, environment);
    }
    if ((center === 5) && (distance > 0)) {
      this.run(248, environment);
      this.run(250, environment);
      this.run(252, environment);
    }
  }


  /** Runs the statements of one BASIC line. */
  private run(line: number, environment: DrawingEnvironment): void {
    for (const statement of DRAWING_LINES[line]) {
      if (statement.startsWith('HPLOT')) {
        this.hplot(statement.slice('HPLOT'.length).trim(), environment);
      } else {
        const [ name, expression ] = statement.split('=').map((part: string): string => part.trim());

        environment.set(name, evaluateExpression(expression, environment));
      }
    }
  }


  /** HPLOT x,y TO x,y ... or HPLOT TO x,y ... */
  private hplot(body: string, environment: DrawingEnvironment): void {
    const continues: boolean = body.startsWith('TO ');
    const points: string[] = (continues ? body.slice(3) : body).split(/\s+TO\s+/);

    points.forEach((point: string, index: number): void => {
      const [ column, row ] = this.coordinates(point, environment);

      if (index === 0 && !continues) {
        this.hires.hplot(column, row);
      } else {
        this.hires.hplotTo(column, row);
      }
    });
  }


  private coordinates(point: string, environment: DrawingEnvironment): [ number, number ] {
    let depth: number = 0;
    let split: number = -1;

    for (let index: number = 0; (index < point.length) && (split < 0); index++) {
      if (point[index] === '(') {
        depth = depth + 1;
      } else if (point[index] === ')') {
        depth = depth - 1;
      } else if ((point[index] === ',') && (depth === 0)) {
        split = index;
      }
    }

    const column: number = evaluateExpression(point.slice(0, split), environment).toAddress();

    if (column >= WIDTH) {
      throw new IllegalQuantityError('HPLOT X', column);
    }

    const row: number = evaluateExpression(point.slice(split + 1), environment).toByte();

    if (row >= HEIGHT) {
      throw new IllegalQuantityError('HPLOT Y', row);
    }

    return [ column, row ];
  }
}
