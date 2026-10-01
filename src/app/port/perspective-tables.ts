import { BasicNumber } from '../runtime/applesoft/basic-number';

// The wireframe geometry the dungeon view is drawn from (listing lines 20 and 51-62). Every value
// is an integer variable, so each real result is rounded down as it is stored.

export interface IPerspectiveTables {
  readonly XX: readonly number[];
  readonly YY: readonly number[];
  readonly PER: readonly (readonly number[])[];
  readonly LD: readonly (readonly number[])[];
  readonly CD: readonly (readonly number[])[];
  readonly FT: readonly (readonly number[])[];
  readonly LAD: readonly (readonly number[])[];
}


const n: (integer: number) => BasicNumber = BasicNumber.of;
const lit: (text: string) => BasicNumber = BasicNumber.parse;
const LEVELS: number = 11;


function grid(columns: number): number[][] {
  return Array.from({ length: LEVELS }, (): number[] => new Array<number>(columns).fill(0));
}


/** An integer expression divided by three and stored: (a)/3. */
function thirdOf(sum: number): number {
  return n(sum).over(n(3)).toInteger();
}


/** 139 or 79 less or plus a third of an integer, stored: base-a/3 as in lines 55, 60. */
function offsetByThird(base: number, amount: number, sign: 1 | -1): number {
  const third: BasicNumber = n(amount).over(n(3));

  return (sign === 1) ? n(base).plus(third).toInteger() : n(base).minus(third).toInteger();
}


export function buildPerspectiveTables(): IPerspectiveTables {
  const XX: number[] = new Array<number>(LEVELS).fill(0);
  const YY: number[] = new Array<number>(LEVELS).fill(0);
  const PER: number[][] = grid(4);
  const LD: number[][] = grid(6);
  const CD: number[][] = grid(4);
  const FT: number[][] = grid(6);
  const LAD: number[][] = grid(4);

  XX[0] = 139;
  YY[0] = 79;

  for (let x: number = 2; x <= 20; x = x + 2) {
    const depth: number = x / 2;

    XX[depth] = n(1).over(n(x)).atn().over(n(1).atn()).times(n(140)).plus(lit('.5')).int().toInteger();
    YY[depth] = n(XX[depth]).times(n(4)).over(n(7)).int().toInteger();
    PER[depth][0] = 139 - XX[depth];
    PER[depth][1] = 139 + XX[depth];
    PER[depth][2] = 79 - YY[depth];
    PER[depth][3] = 79 + YY[depth];
  }

  PER[0][0] = 0;
  PER[0][1] = 279;
  PER[0][2] = 0;
  PER[0][3] = 159;

  for (let x: number = 1; x <= 10; x++) {
    CD[x][0] = offsetByThird(139, XX[x], -1);
    CD[x][1] = offsetByThird(139, XX[x], 1);
    CD[x][2] = n(79).minus(n(YY[x]).times(lit('.7'))).toInteger();
    CD[x][3] = 79 + YY[x];
  }

  for (let x: number = 0; x <= 9; x++) {
    LD[x][0] = thirdOf(PER[x][0] * 2 + PER[x + 1][0]);
    LD[x][1] = thirdOf(PER[x][0] + 2 * PER[x + 1][0]);
    const w: number = LD[x][0] - PER[x][0];

    LD[x][2] = n(PER[x][2]).plus(n(w).times(n(4)).over(n(7))).toInteger();
    LD[x][3] = n(PER[x][2]).plus(n(2).times(n(w)).times(n(4)).over(n(7))).toInteger();
    LD[x][4] = thirdOf(PER[x][3] * 2 + PER[x + 1][3]);
    LD[x][5] = thirdOf(PER[x][3] + 2 * PER[x + 1][3]);
    LD[x][2] = n(LD[x][4]).minus(n(LD[x][4] - LD[x][2]).times(lit('.8'))).toInteger();
    LD[x][3] = n(LD[x][5]).minus(n(LD[x][5] - LD[x][3]).times(lit('.8'))).toInteger();

    if (LD[x][3] === LD[x][4]) {
      LD[x][3] = LD[x][3] - 1;
    }
  }

  for (let x: number = 0; x <= 9; x++) {
    FT[x][0] = offsetByThird(139, XX[x], -1);
    FT[x][1] = offsetByThird(139, XX[x], 1);
    FT[x][2] = offsetByThird(139, XX[x + 1], -1);
    FT[x][3] = offsetByThird(139, XX[x + 1], 1);
    FT[x][4] = n(79).plus(n(YY[x] * 2 + YY[x + 1]).over(n(3))).toInteger();
    FT[x][5] = n(79).plus(n(YY[x] + 2 * YY[x + 1]).over(n(3))).toInteger();
  }

  for (let x: number = 0; x <= 9; x++) {
    LAD[x][0] = thirdOf(FT[x][0] * 2 + FT[x][1]);
    LAD[x][1] = thirdOf(FT[x][0] + 2 * FT[x][1]);
    LAD[x][3] = FT[x][4];
    LAD[x][2] = 159 - LAD[x][3];
  }

  return { XX, YY, PER, LD, CD, FT, LAD };
}
