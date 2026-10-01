import type { FacImage } from './math-package';
import { MathPackage } from './math-package';

// An Applesoft real as the FAC holds it, rounding byte included. Operators follow FRMEVL: the left
// operand is rounded when it is pushed, the right keeps whatever the last operation left in FACOV.

const MATH: MathPackage = new MathPackage();
const SCRATCH: number = 0x0900;
const literals: Map<string, BasicNumber> = new Map<string, BasicNumber>();


export class BasicNumber {
  public static readonly ZERO: BasicNumber = new BasicNumber([ 0, 0, 0, 0, 0, 0, 0 ]);


  private constructor(public readonly image: FacImage) {
  }


  /** A number as FIN reads it, for literals in the listing and for VAL. */
  public static parse(text: string): BasicNumber {
    let value: BasicNumber | undefined = literals.get(text);

    if (value == null) {
      const math: MathPackage = new MathPackage();

      math.fin(text);
      value = new BasicNumber(math.fac);
      literals.set(text, value);
    }

    return value;
  }


  /** VAL: the number a string starts with, or zero. */
  public static val(text: string): BasicNumber {
    const math: MathPackage = new MathPackage();

    math.fin(text);

    return new BasicNumber(math.fac);
  }


  /** An integer variable or counter as GIVAYF floats it. */
  public static of(integer: number): BasicNumber {
    let value: BasicNumber = BasicNumber.ZERO;

    if (integer !== 0) {
      const magnitude: number = Math.abs(integer);
      const bits: number = 32 - Math.clz32(magnitude);
      const mantissa: number = (magnitude * 2 ** (32 - bits)) >>> 0;

      value = new BasicNumber([
        0x80 + bits,
        (mantissa >>> 24) & 0xFF,
        (mantissa >>> 16) & 0xFF,
        (mantissa >>> 8) & 0xFF,
        mantissa & 0xFF,
        (integer < 0) ? 0xFF : 0x00,
        0,
      ]);
    }

    return value;
  }


  /** Wraps an image read straight from the FAC. */
  public static fromFac(image: FacImage): BasicNumber {
    return new BasicNumber(image);
  }


  public plus(right: BasicNumber): BasicNumber {
    return this.performed(right, (): void => MATH.faddt());
  }


  public minus(right: BasicNumber): BasicNumber {
    return this.performed(right, (): void => MATH.fsubt());
  }


  public times(right: BasicNumber): BasicNumber {
    return this.performed(right, (): void => MATH.fmultt());
  }


  public over(right: BasicNumber): BasicNumber {
    return this.performed(right, (): void => MATH.fdivt());
  }


  public toThe(right: BasicNumber): BasicNumber {
    return this.performed(right, (): void => MATH.fpwrt());
  }


  public negated(): BasicNumber {
    return this.applied((): void => MATH.negop());
  }


  public int(): BasicNumber {
    return this.applied((): void => MATH.int());
  }


  public abs(): BasicNumber {
    return this.applied((): void => MATH.abs());
  }


  public sgn(): BasicNumber {
    return this.applied((): void => MATH.sgn());
  }


  public sqr(): BasicNumber {
    return this.applied((): void => MATH.sqr());
  }


  public atn(): BasicNumber {
    return this.applied((): void => MATH.atn());
  }


  /** What assigning to a real variable keeps: the value rounded to five bytes. */
  public stored(): BasicNumber {
    MATH.fac = this.image;
    MATH.movmf(SCRATCH);

    return new BasicNumber(MATH.fac);
  }


  /** Assignment to an integer variable (AYINT): rounds down, and throws outside -32767 to 32767. */
  public toInteger(): number {
    return this.integerBy((): void => MATH.ayint());
  }


  /** A subscript (MKINT): rounds down, and a negative value throws. */
  public toSubscript(): number {
    return this.integerBy((): void => MATH.mkint());
  }


  /** GETADR, as HPLOT's horizontal coordinate reads it: 0 to 65535, a negative one wrapping round. */
  public toAddress(): number {
    MATH.fac = this.image;
    MATH.getadr();

    return (MATH.fac[3] << 8) | MATH.fac[4];
  }


  /** GETBYT, as HPLOT's vertical coordinate reads it: 0 to 255, anything else throws. */
  public toByte(): number {
    MATH.fac = this.image;
    MATH.conint();

    return MATH.fac[4];
  }


  public isLessThan(right: BasicNumber): boolean {
    return this.compared(right) === 1;
  }


  public isGreaterThan(right: BasicNumber): boolean {
    return this.compared(right) === 0xFF;
  }


  public isEqualTo(right: BasicNumber): boolean {
    return this.compared(right) === 0;
  }


  /** What PRINT and STR$ produce. */
  public print(): string {
    MATH.fac = this.image;

    return MATH.fout();
  }


  private compared(right: BasicNumber): number {
    MATH.fac = this.image;
    MATH.movmf(SCRATCH);
    MATH.fac = right.image;

    return MATH.fcomp(SCRATCH);
  }


  private performed(right: BasicNumber, perform: () => void): BasicNumber {
    MATH.fac = this.image;
    MATH.round();
    const pushed: FacImage = MATH.fac;

    MATH.fac = right.image;
    MATH.setArg(pushed);
    perform();

    return new BasicNumber(MATH.fac);
  }


  private applied(perform: () => void): BasicNumber {
    MATH.fac = this.image;
    perform();

    return new BasicNumber(MATH.fac);
  }


  private integerBy(convert: () => void): number {
    MATH.fac = this.image;
    convert();
    const packed: number = (MATH.fac[3] << 8) | MATH.fac[4];

    return (packed >= 0x8000) ? packed - 0x10000 : packed;
  }
}
