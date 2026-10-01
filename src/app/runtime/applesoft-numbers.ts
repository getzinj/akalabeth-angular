import { IllegalQuantityError } from './applesoft-errors';

// The ROM's conversions from a floating-point argument to the integers statements need.

/** GETBYT: must not be negative, truncates, and must fit in a byte. */
export function getbyt(what: string, value: number): number {
  const truncated: number = Math.trunc(value);

  if ((value >= 0) && (truncated < 256)) {
    return truncated;
  } else {
    throw new IllegalQuantityError(what, value);
  }
}


/** GETADR: magnitude below 65536, truncates, and a negative result wraps to two's complement. */
export function getadr(what: string, value: number): number {
  const truncated: number = Math.trunc(value);

  if (Math.abs(value) < 65536) {
    return (truncated < 0) ? truncated + 65536 : truncated + 0;
  } else {
    throw new IllegalQuantityError(what, value);
  }
}
