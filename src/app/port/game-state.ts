import { BasicNumber } from '../runtime/applesoft/basic-number';

// The listing's variables, under names that say what they hold. Real arrays hold BasicNumbers
// because Applesoft's reals are not doubles.

export class GameState {
  /** LN */
  public luckyNumber: BasicNumber = BasicNumber.ZERO;

  /** LP, 1 to 10 */
  public levelOfPlay: number = 1;

  /** PT$: 'F' or 'M' */
  public playerClass: string = '';

  /** C(0) to C(5): hit points, strength, dexterity, stamina, wisdom, gold */
  public readonly attributes: BasicNumber[] = new Array<BasicNumber>(6).fill(BasicNumber.ZERO);

  /** PW(0) to PW(5): food, rapiers, axes, shields, bows, amulets */
  public readonly possessions: BasicNumber[] = new Array<BasicNumber>(6).fill(BasicNumber.ZERO);
}
