/** Applesoft's ?ILLEGAL QUANTITY ERROR, which the game's ONERR GOTO 4 turns into a restart. */
export class IllegalQuantityError extends Error {
  constructor(what: string, value: number) {
    super(`?ILLEGAL QUANTITY ERROR: ${ what } ${ value }`);
  }
}


/** A PEEK, POKE or CALL address the port does not emulate. */
export class UnemulatedAddressError extends Error {
  constructor(operation: string, address: number) {
    super(`${ operation } ${ address } is not emulated`);
  }
}
