import { IllegalQuantityError } from './applesoft-errors';
import { getadr, getbyt } from './applesoft-numbers';


describe('getbyt', (): void => {
  it('truncates toward zero', (): void => {
    expect(getbyt('X', 3.9)).toBe(3);
  });

  it('accepts 255', (): void => {
    expect(getbyt('X', 255)).toBe(255);
  });

  it('refuses 256', (): void => {
    expect((): number => getbyt('X', 256)).toThrow(IllegalQuantityError);
  });

  it('refuses a negative fraction, since MKINT checks the sign first', (): void => {
    expect((): number => getbyt('X', -0.5)).toThrow(IllegalQuantityError);
  });
});


describe('getadr', (): void => {
  it('truncates a negative fraction to zero', (): void => {
    expect(getadr('X', -0.5)).toBe(0);
  });

  it('wraps -1 to 65535', (): void => {
    expect(getadr('X', -1)).toBe(65535);
  });

  it('wraps -16384 to the keyboard address', (): void => {
    expect(getadr('X', -16384)).toBe(0xC000);
  });

  it('refuses 65536', (): void => {
    expect((): number => getadr('X', 65536)).toThrow(IllegalQuantityError);
  });
});
