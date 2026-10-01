import type { FacImage } from './math-package';


/** The exact value of a FAC image, rounding byte excluded. Every such value is a JS double. */
export function facToNumber(fac: FacImage): number {
  const mantissa: number = (((fac[1] * 256) + fac[2]) * 256 + fac[3]) * 256 + fac[4];
  const magnitude: number = (fac[0] === 0) ? 0 : mantissa * Math.pow(2, fac[0] - 160);

  return ((fac[5] & 0x80) !== 0) ? -magnitude : magnitude;
}
