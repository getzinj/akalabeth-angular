import { facToNumber } from './fac-value';


describe('facToNumber', (): void => {
  it('reads 1', (): void => {
    expect(facToNumber([ 0x81, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00 ])).toBe(1);
  });

  it('reads .5', (): void => {
    expect(facToNumber([ 0x80, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00 ])).toBe(0.5);
  });

  it('reads 31.4 as the nearest 32-bit binary fraction', (): void => {
    expect(facToNumber([ 0x85, 0xFB, 0x33, 0x33, 0x33, 0x00, 0x00 ])).toBe(0xFB333333 / 2 ** 27);
  });

  it('reads a negative sign from bit 7 of the sign byte', (): void => {
    expect(facToNumber([ 0x82, 0x80, 0x00, 0x00, 0x00, 0xFF, 0x00 ])).toBe(-2);
  });

  it('reads a zero exponent as zero whatever the mantissa', (): void => {
    expect(facToNumber([ 0x00, 0x80, 0x12, 0x34, 0x56, 0x00, 0x00 ])).toBe(0);
  });
});
