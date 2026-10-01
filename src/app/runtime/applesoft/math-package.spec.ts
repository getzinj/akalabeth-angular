import binaryCases from './fixtures/binary.json';
import finCases from './fixtures/fin.json';
import foutCases from './fixtures/fout.json';
import functionCases from './fixtures/function.json';
import rndCases from './fixtures/rnd.json';
import roundCases from './fixtures/round.json';
import type { FacImage } from './math-package';
import { MathPackage } from './math-package';

// Every expected value here was recorded from the real Applesoft ROM; see apps/Akalabeth/tools/oracle.

function image(hex: string): FacImage {
  return [ 0, 2, 4, 6, 8, 10, 12 ].map((offset: number): number => parseInt(hex.substring(offset, offset + 2), 16)) as unknown as FacImage;
}


function hex(fac: FacImage): string {
  return fac.map((byte: number): string => byte.toString(16).toUpperCase().padStart(2, '0')).join('');
}


function pushed(left: string): FacImage {
  const math: MathPackage = new MathPackage();

  math.fac = image(left);
  math.round();

  return math.fac;
}


describe('MathPackage', (): void => {
  describe('FIN', (): void => {
    it.each(finCases as [ string, string ][])('reads %s', (text: string, expected: string): void => {
      const math: MathPackage = new MathPackage();

      math.fin(text);

      expect(hex(math.fac)).toBe(expected);
    });
  });

  describe('FOUT', (): void => {
    it.each(foutCases as [ string, string ][])('prints %s', (input: string, expected: string): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(input);

      expect(math.fout()).toBe(expected);
    });
  });

  describe('ROUND', (): void => {
    it.each(roundCases as [ string, string ][])('rounds %s', (input: string, expected: string): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(input);
      math.round();

      expect(hex(math.fac)).toBe(expected);
    });
  });

  describe('binary operators', (): void => {
    const performers: Record<string, (math: MathPackage) => void> = {
      '+': (math: MathPackage): void => math.faddt(),
      '-': (math: MathPackage): void => math.fsubt(),
      '*': (math: MathPackage): void => math.fmultt(),
      '/': (math: MathPackage): void => math.fdivt(),
      '^': (math: MathPackage): void => math.fpwrt(),
    };

    it.each(binaryCases as [ string, string, string, string ][])('%s of %s and %s', (operation: string, left: string, right: string, expected: string): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(right);
      math.setArg(pushed(left));
      performers[operation](math);

      expect(hex(math.fac)).toBe(expected);
    });
  });

  describe('functions', (): void => {
    const functions: Record<string, (math: MathPackage) => void> = {
      INT: (math: MathPackage): void => math.int(),
      SQR: (math: MathPackage): void => math.sqr(),
      ATN: (math: MathPackage): void => math.atn(),
      LOG: (math: MathPackage): void => math.log(),
      EXP: (math: MathPackage): void => math.exp(),
      ABS: (math: MathPackage): void => math.abs(),
      SGN: (math: MathPackage): void => math.sgn(),
      NEGOP: (math: MathPackage): void => math.negop(),
    };

    it.each(functionCases as [ string, string, string ][])('%s of %s', (name: string, argument: string, expected: string): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(argument);
      functions[name](math);

      expect(hex(math.fac)).toBe(expected);
    });
  });

  describe('RND', (): void => {
    const sequences: [ string, string, string[], string ][] = rndCases as [ string, string, string[], string ][];

    it.each(sequences)('seeds from %s', (seed: string, first: string): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(seed);
      math.rnd();

      expect(hex(math.fac)).toBe(first);
    });

    it.each(sequences)('continues the sequence seeded from %s', (seed: string, _first: string, sequence: string[]): void => {
      const math: MathPackage = new MathPackage();
      const produced: string[] = [];

      math.fac = image(seed);
      math.rnd();
      for (let count: number = 0; count < sequence.length; count++) {
        math.fac = image('81800000000000');
        math.rnd();
        produced.push(hex(math.fac));
      }

      expect(produced).toEqual(sequence);
    });

    it.each(sequences)('repeats the last number for RND(0) after %s', (seed: string, _first: string, sequence: string[], repeat: string): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(seed);
      math.rnd();
      for (let count: number = 0; count < sequence.length; count++) {
        math.fac = image('81800000000000');
        math.rnd();
      }
      math.fac = image('00000000000000');
      math.rnd();

      expect(hex(math.fac)).toBe(repeat);
    });
  });
});
