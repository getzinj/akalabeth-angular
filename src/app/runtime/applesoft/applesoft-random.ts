import { BasicNumber } from './basic-number';
import { MathPackage } from './math-package';

// RND's state is the five bytes at RNDX, and RND(x) reseeds when x is negative, repeats when x is
// zero and advances otherwise.

export class ApplesoftRandom {
  private readonly math: MathPackage = new MathPackage();


  public rnd(argument: BasicNumber): BasicNumber {
    this.math.fac = argument.image;
    this.math.rnd();

    return BasicNumber.fromFac(this.math.fac);
  }


  public next(): BasicNumber {
    return this.rnd(BasicNumber.parse('1'));
  }
}
