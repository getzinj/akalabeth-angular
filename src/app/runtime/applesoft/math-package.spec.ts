import binaryCases from './fixtures/binary.json';
import addressCases from './fixtures/address.json';
import compareCases from './fixtures/compare.json';
import finCases from './fixtures/fin.json';
import foutCases from './fixtures/fout.json';
import functionCases from './fixtures/function.json';
import integerCases from './fixtures/integer.json';
import powerCases from './fixtures/power.json';
import rndCases from './fixtures/rnd.json';
import roundCases from './fixtures/round.json';
import type { FacImage } from './math-package';
import { IllegalQuantityError, MathPackage } from './math-package';

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

  describe('powers of whole numbers, negative ones included', (): void => {
    function raised(base: string, exponent: string): string | null {
      const math: MathPackage = new MathPackage();
      let result: string | null = null;

      math.fac = image(exponent);
      math.setArg(pushed(base));
      try {
        math.fpwrt();
        result = hex(math.fac);
      } catch (error) {
        if (!(error instanceof IllegalQuantityError)) {
          throw error;
        }
      }

      return result;
    }

    it.each(powerCases as [ string, string, string | null ][])('%s to the power %s', (base: string, exponent: string, expected: string | null): void => {
      expect(raised(base, exponent)).toBe(expected);
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

  describe('integer conversion', (): void => {
    function converted(routine: string, argument: string): number | null {
      const math: MathPackage = new MathPackage();
      let result: number | null = null;

      math.fac = image(argument);
      try {
        if (routine === 'AYINT') {
          math.ayint();
        } else {
          math.mkint();
        }
        const packed: number = (math.fac[3] << 8) | math.fac[4];

        result = (packed >= 0x8000) ? packed - 0x10000 : packed;
      } catch (error) {
        if (!(error instanceof IllegalQuantityError)) {
          throw error;
        }
      }

      return result;
    }

    it.each(integerCases as [ string, string, number | null ][])('%s of %s', (routine: string, argument: string, expected: number | null): void => {
      expect(converted(routine, argument)).toBe(expected);
    });
  });

  describe('GETADR and CONINT', (): void => {
    function converted(routine: string, argument: string): number | null {
      const math: MathPackage = new MathPackage();
      let result: number | null = null;

      math.fac = image(argument);
      try {
        if (routine === 'GETADR') {
          math.getadr();
          result = (math.fac[3] << 8) | math.fac[4];
        } else {
          math.conint();
          result = math.fac[4];
        }
      } catch (error) {
        if (!(error instanceof IllegalQuantityError)) {
          throw error;
        }
      }

      return result;
    }

    it.each(addressCases as [ string, string, number | null ][])('%s of %s', (routine: string, argument: string, expected: number | null): void => {
      expect(converted(routine, argument)).toBe(expected);
    });
  });

  describe('FCOMP', (): void => {
    const POINTER: number = 0x0900;

    it.each(compareCases as [ string, string, number ][])('compares %s with %s', (left: string, right: string, expected: number): void => {
      const math: MathPackage = new MathPackage();

      math.fac = image(left);
      math.movmf(POINTER);
      math.fac = image(right);

      expect(math.fcomp(POINTER)).toBe(expected);
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
