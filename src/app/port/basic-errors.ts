import { IllegalQuantityError as RuntimeIllegalQuantityError } from '../runtime/applesoft-errors';
import { DivisionByZeroError, IllegalQuantityError, OverflowError } from '../runtime/applesoft/math-package';

export class BadSubscriptError extends Error {
  constructor() {
    super('?BAD SUBSCRIPT ERROR');
  }
}


/** A loop the original never leaves: a thief with nothing to steal. Only Ctrl-C, which restarts the game, ends it. */
export class StuckError extends Error {
  constructor() {
    super('The original program loops forever here');
  }
}


/** Any error the original handles with ONERR GOTO 4, which restarts the game. */
export function restartsTheGame(error: unknown): boolean {
  return (error instanceof BadSubscriptError)
    || (error instanceof IllegalQuantityError)
    || (error instanceof RuntimeIllegalQuantityError)
    || (error instanceof StuckError)
    || (error instanceof OverflowError)
    || (error instanceof DivisionByZeroError);
}
