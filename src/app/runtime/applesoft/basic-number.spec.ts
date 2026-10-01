import { BasicNumber } from './basic-number';
import { IllegalQuantityError } from './math-package';


function hex(value: BasicNumber): string {
  return value.image.map((byte: number): string => byte.toString(16).toUpperCase().padStart(2, '0')).join('');
}


describe('BasicNumber', (): void => {
  describe('of', (): void => {
    it.each([ 1, 2, 3, 7, 10, 255, 1000, 31999, 32767, -1, -5, -32767 ])('floats %i as FIN reads it', (integer: number): void => {
      expect(hex(BasicNumber.of(integer))).toBe(hex(BasicNumber.parse(String(integer))));
    });

    it('floats zero to a zero exponent', (): void => {
      expect(BasicNumber.of(0).image[0]).toBe(0);
    });
  });

  describe('parse', (): void => {
    it('reads 31.4 to the nearest 32-bit binary fraction', (): void => {
      expect(hex(BasicNumber.parse('31.4'))).toBe('85FB33333300'.padEnd(14, '0'));
    });

    it('reads the same text to the same value twice', (): void => {
      expect(BasicNumber.parse('.95')).toBe(BasicNumber.parse('.95'));
    });
  });

  describe('operators', (): void => {
    it('adds', (): void => {
      expect(hex(BasicNumber.of(1).plus(BasicNumber.of(2)))).toBe(hex(BasicNumber.of(3)));
    });

    it('subtracts', (): void => {
      expect(hex(BasicNumber.of(139).minus(BasicNumber.of(40)))).toBe(hex(BasicNumber.of(99)));
    });

    it('multiplies', (): void => {
      expect(hex(BasicNumber.of(12).times(BasicNumber.of(11)))).toBe(hex(BasicNumber.of(132)));
    });

    it('divides', (): void => {
      expect(hex(BasicNumber.of(42).over(BasicNumber.of(6)))).toBe(hex(BasicNumber.of(7)));
    });

    it('raises to a power', (): void => {
      expect(hex(BasicNumber.of(2).toThe(BasicNumber.of(5)))).toBe(hex(BasicNumber.of(32)));
    });

    it('negates', (): void => {
      expect(hex(BasicNumber.of(4).negated())).toBe(hex(BasicNumber.of(-4)));
    });

    it('takes the integer part of a positive number', (): void => {
      expect(BasicNumber.parse('4.5').int().toInteger()).toBe(4);
    });

    it('takes the integer part of a negative number downwards', (): void => {
      expect(BasicNumber.parse('-4.5').int().toInteger()).toBe(-5);
    });

    it('takes the square root, printed to nine digits', (): void => {
      expect(BasicNumber.of(144).sqr().print()).toBe('12');
    });
  });

  describe('integer conversion', (): void => {
    it('rounds down when assigned to an integer variable', (): void => {
      expect(BasicNumber.parse('-1.5').toInteger()).toBe(-2);
    });

    it('rejects 32768 as an integer variable', (): void => {
      expect((): number => BasicNumber.of(16384).times(BasicNumber.of(2)).toInteger()).toThrow(IllegalQuantityError);
    });

    it('truncates a positive subscript', (): void => {
      expect(BasicNumber.parse('9.99').toSubscript()).toBe(9);
    });

    it('rejects a negative subscript', (): void => {
      expect((): number => BasicNumber.of(-1).toSubscript()).toThrow(IllegalQuantityError);
    });
  });

  describe('comparison', (): void => {
    it('finds 1 less than 2', (): void => {
      expect(BasicNumber.of(1).isLessThan(BasicNumber.of(2))).toBe(true);
    });

    it('finds 2 greater than 1', (): void => {
      expect(BasicNumber.of(2).isGreaterThan(BasicNumber.of(1))).toBe(true);
    });

    it('finds a number equal to itself', (): void => {
      expect(BasicNumber.parse('.95').isEqualTo(BasicNumber.parse('.95'))).toBe(true);
    });
  });

  describe('print', (): void => {
    it('prints without a leading space', (): void => {
      expect(BasicNumber.of(25).print()).toBe('25');
    });

    it('prints a negative number with its sign', (): void => {
      expect(BasicNumber.of(-7).print()).toBe('-7');
    });
  });
});
