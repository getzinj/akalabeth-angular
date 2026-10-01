// The Applesoft floating-point package, ported from Microsoft's 6502 BASIC (github.com/microsoft/
// BASIC-M6502, MIT licence, Copyright (c) Microsoft Corporation) as configured for the Apple
// (REALIO=4, ADDPRC=1). Applesoft's own math is this code, so it is ported register by register:
// carries, the rounding byte and the sign byte's stray bits all decide results, and the
// fixtures recorded from the real ROM pin every routine. Numbers in the original are octal.

export class OverflowError extends Error {
  constructor() {
    super('?OVERFLOW ERROR');
  }
}


export class DivisionByZeroError extends Error {
  constructor() {
    super('?DIVISION BY ZERO ERROR');
  }
}


export class IllegalQuantityError extends Error {
  constructor() {
    super('?ILLEGAL QUANTITY ERROR');
  }
}


/** FAC as seven bytes: exponent, four mantissa bytes, sign byte, rounding byte. */
export type FacImage = readonly [ number, number, number, number, number, number, number ];

const FACEXP: number = 0x9D;
const FACHO: number = 0x9E;
const FACMOH: number = 0x9F;
const FACMO: number = 0xA0;
const FACLO: number = 0xA1;
const FACSGN: number = 0xA2;
const SGNFLG: number = 0xA3;
const ARGEXP: number = 0xA5;
const ARGHO: number = 0xA6;
const ARGMOH: number = 0xA7;
const ARGMO: number = 0xA8;
const ARGLO: number = 0xA9;
const ARGSGN: number = 0xAA;
const ARISGN: number = 0xAB;
const FACOV: number = 0xAC;
const RESHO: number = 0x62;
const RESMOH: number = 0x63;
const RESMO: number = 0x64;
const RESLO: number = 0x65;
const BITS: number = 0x91;
const OLDOV: number = 0x92;
const INTEGR: number = 0x93;
const FBUFPT: number = 0x95;
const DECCNT: number = 0x99;
const TENEXP: number = 0x9A;
const DPTFLG: number = 0x9B;
const EXPSGN: number = 0x9C;
const RNDX: number = 0xC9;
const FBUFFR: number = 0x0100;
const TEMPF1: number = 0x0293;
const TEMPF2: number = 0x0298;
const TEMPF3: number = 0x029D;

const CONSTANTS: number = 0xE000;


/** Lays the constant table out the way the ROM does, overlaps included. */
function constantTable(): { readonly bytes: number[]; readonly at: Record<string, number> } {
  const bytes: number[] = [];
  const at: Record<string, number> = {};
  const put = (name: string, ...values: number[]): void => {
    at[name] = CONSTANTS + bytes.length;
    bytes.push(...values);
  };

  put('FONE', 0x81, 0x00, 0x00, 0x00, 0x00);
  put('LOGCN2', 3, 0x7F, 0x5E, 0x56, 0xCB, 0x79, 0x80, 0x13, 0x9B, 0x0B, 0x64, 0x80, 0x76, 0x38, 0x93, 0x16,
      0x82, 0x38, 0xAA, 0x3B, 0x20);
  put('SQRHLF', 0x80, 0x35, 0x04, 0xF3, 0x34);
  put('SQRTWO', 0x81, 0x35, 0x04, 0xF3, 0x34);
  put('NEGHLF', 0x80, 0x80, 0x00, 0x00, 0x00);
  put('LOG2', 0x80, 0x31, 0x72, 0x17, 0xF8);
  put('TENZC', 0x84, 0x20, 0x00, 0x00, 0x00);
  put('NZ0999', 0x9B, 0x3E, 0xBC, 0x1F, 0xFD);
  put('NZ9999', 0x9E, 0x6E, 0x6B, 0x27, 0xFD);
  put('NZMIL', 0x9E, 0x6E, 0x6B, 0x28, 0x00);
  put('FHALF', 0x80, 0x00, 0x00, 0x00, 0x00);
  put('FOUTBL', 0xFA, 0x0A, 0x1F, 0x00, 0x00, 0x98, 0x96, 0x80, 0xFF, 0xF0, 0xBD, 0xC0, 0x00, 0x01, 0x86, 0xA0,
      0xFF, 0xFF, 0xD8, 0xF0, 0x00, 0x00, 0x03, 0xE8, 0xFF, 0xFF, 0xFF, 0x9C, 0x00, 0x00, 0x00, 0x0A,
      0xFF, 0xFF, 0xFF, 0xFF);
  put('LOGEB2', 0x81, 0x38, 0xAA, 0x3B, 0x29);
  put('EXPCON', 7, 0x71, 0x34, 0x58, 0x3E, 0x56, 0x74, 0x16, 0x7E, 0xB3, 0x1B, 0x77, 0x2F, 0xEE, 0xE3, 0x85,
      0x7A, 0x1D, 0x84, 0x1C, 0x2A, 0x7C, 0x63, 0x59, 0x58, 0x0A, 0x7E, 0x75, 0xFD, 0xE7, 0xC6,
      0x80, 0x31, 0x72, 0x18, 0x10, 0x81, 0x00, 0x00, 0x00, 0x00);
  // Four bytes each, so the multiplier borrows the adder's first byte and the adder borrows the
  // JSR opcode ($20) that follows it in the ROM.
  put('RMULZC', 0x98, 0x35, 0x44, 0x7A);
  put('RADDZC', 0x68, 0x28, 0xB1, 0x46, 0x20);
  put('PI2', 0x81, 0x49, 0x0F, 0xDA, 0xA2);
  put('ATNCON', 11, 0x76, 0xB3, 0x83, 0xBD, 0xD3, 0x79, 0x1E, 0xF4, 0xA6, 0xF5, 0x7B, 0x83, 0xFC, 0xB0, 0x10,
      0x7C, 0x0C, 0x1F, 0x67, 0xCA, 0x7C, 0xDE, 0x53, 0xCB, 0xC1, 0x7D, 0x14, 0x64, 0x70, 0x4C,
      0x7D, 0xB7, 0xEA, 0x51, 0x7A, 0x7D, 0x63, 0x30, 0x88, 0x7E, 0x7E, 0x92, 0x44, 0x99, 0x3A,
      0x7E, 0x4C, 0xCC, 0x91, 0xC7, 0x7F, 0xAA, 0xAA, 0xAA, 0x13, 0x81, 0x00, 0x00, 0x00, 0x00);

  return { bytes, at };
}

const TABLE: { readonly bytes: number[]; readonly at: Record<string, number> } = constantTable();
const K: Record<string, number> = TABLE.at;


export class MathPackage {
  private readonly m: Uint8Array = new Uint8Array(0x10000);

  private a: number = 0;
  private x: number = 0;
  private y: number = 0;
  private c: boolean = false;
  private z: boolean = false;
  private n: boolean = false;
  private v: boolean = false;

  private readonly stack: number[] = [];
  private text: string = '';
  private textIndex: number = 0;


  constructor() {
    this.m.set(TABLE.bytes, CONSTANTS);
    this.m.set([ 0x80, 0x4F, 0xC7, 0x52, 0x00 ], RNDX);
  }


  // ---- the FAC as the outside world sees it ----

  public get fac(): FacImage {
    return [ this.m[FACEXP], this.m[FACHO], this.m[FACMOH], this.m[FACMO], this.m[FACLO], this.m[FACSGN], this.m[FACOV] ];
  }


  public set fac(image: FacImage) {
    this.m.set(image.slice(0, 6), FACEXP);
    this.m[FACOV] = image[6];
  }


  public get seed(): readonly number[] {
    return Array.from(this.m.subarray(RNDX, RNDX + 5));
  }


  public set seed(packed: readonly number[]) {
    this.m.set(packed, RNDX);
  }


  /** Loads ARG and ARISGN the way FRMEVL pops a pushed operand before calling a performer. */
  public setArg(image: FacImage): void {
    this.m.set(image.slice(0, 6), ARGEXP);
    this.m[ARISGN] = image[5] ^ this.m[FACSGN];
  }


  // ---- 6502 primitives ----

  private nz(value: number): number {
    const byte: number = value & 0xFF;

    this.z = byte === 0;
    this.n = (byte & 0x80) !== 0;

    return byte;
  }

  private lda(value: number): void {
    this.a = this.nz(value);
  }

  private ldx(value: number): void {
    this.x = this.nz(value);
  }

  private ldy(value: number): void {
    this.y = this.nz(value);
  }

  private adc(value: number): void {
    const sum: number = this.a + value + (this.c ? 1 : 0);

    this.v = ((~(this.a ^ value) & (this.a ^ sum)) & 0x80) !== 0;
    this.c = sum > 0xFF;
    this.a = this.nz(sum);
  }

  private sbc(value: number): void {
    const difference: number = this.a - value - (this.c ? 0 : 1);

    this.v = (((this.a ^ value) & (this.a ^ difference)) & 0x80) !== 0;
    this.c = difference >= 0;
    this.a = this.nz(difference);
  }

  private compare(register: number, value: number): void {
    this.c = register >= value;
    this.nz(register - value);
  }

  private eor(value: number): void {
    this.a = this.nz(this.a ^ value);
  }

  private ora(value: number): void {
    this.a = this.nz(this.a | value);
  }

  private and(value: number): void {
    this.a = this.nz(this.a & value);
  }

  private bit(value: number): void {
    this.z = (this.a & value) === 0;
    this.n = (value & 0x80) !== 0;
    this.v = (value & 0x40) !== 0;
  }

  private asl(address: number): void {
    const value: number = this.m[address];

    this.c = (value & 0x80) !== 0;
    this.m[address] = this.nz(value << 1);
  }

  private lsr(address: number): void {
    const value: number = this.m[address];

    this.c = (value & 1) !== 0;
    this.m[address] = this.nz(value >> 1);
  }

  private rol(address: number): void {
    const value: number = this.m[address];
    const carryIn: number = this.c ? 1 : 0;

    this.c = (value & 0x80) !== 0;
    this.m[address] = this.nz((value << 1) | carryIn);
  }

  private ror(address: number): void {
    const value: number = this.m[address];
    const carryIn: number = this.c ? 0x80 : 0;

    this.c = (value & 1) !== 0;
    this.m[address] = this.nz((value >> 1) | carryIn);
  }

  private aslA(): void {
    this.c = (this.a & 0x80) !== 0;
    this.a = this.nz(this.a << 1);
  }

  private lsrA(): void {
    this.c = (this.a & 1) !== 0;
    this.a = this.nz(this.a >> 1);
  }

  private rolA(): void {
    const carryIn: number = this.c ? 1 : 0;

    this.c = (this.a & 0x80) !== 0;
    this.a = this.nz((this.a << 1) | carryIn);
  }

  private rorA(): void {
    const carryIn: number = this.c ? 0x80 : 0;

    this.c = (this.a & 1) !== 0;
    this.a = this.nz((this.a >> 1) | carryIn);
  }

  private inc(address: number): void {
    this.m[address] = this.nz(this.m[address] + 1);
  }

  private dec(address: number): void {
    this.m[address] = this.nz(this.m[address] - 1);
  }

  /** The COM macro: LDA, EORI 377, STA. */
  private com(address: number): void {
    this.lda(this.m[address]);
    this.eor(0xFF);
    this.m[address] = this.a;
  }

  private sta(address: number): void {
    this.m[address & 0xFFFF] = this.a;
  }

  private zp(address: number): number {
    return address & 0xFF;
  }

  private php(): void {
    this.stack.push(this.c ? 1 : 0);
  }

  private plp(): void {
    this.c = this.stack.pop() === 1;
  }


  // ---- addition and subtraction ----

  private faddh(): void {
    this.fadd(K['FHALF']);
  }

  public fsub(pointer: number): void {
    this.conupk(pointer);
    this.fsubt();
  }

  public fsubt(): void {
    this.lda(this.m[FACSGN]);
    this.eor(0xFF);
    this.sta(FACSGN);
    this.eor(this.m[ARGSGN]);
    this.sta(ARISGN);
    this.lda(this.m[FACEXP]);
    this.faddt();
  }

  public fadd(pointer: number): void {
    this.conupk(pointer);
    this.faddt();
  }

  public faddt(): void {
    if (this.m[FACEXP] === 0) {
      this.movfa();
    } else {
      this.ldx(this.m[FACOV]);
      this.m[OLDOV] = this.x;
      this.ldx(ARGEXP);
      this.lda(this.m[ARGEXP]);
      this.faddc();
    }
  }

  private faddc(): void {
    this.ldy(this.a);
    if (this.z) {
      return;
    }
    this.c = true;
    this.sbc(this.m[FACEXP]);
    if (this.z) {
      this.fadd4();
      return;
    }
    if (this.c) {
      this.m[FACEXP] = this.y;
      this.ldy(this.m[ARGSGN]);
      this.m[FACSGN] = this.y;
      this.eor(0xFF);
      this.adc(0);
      this.ldy(0);
      this.m[OLDOV] = 0;
      this.ldx(FACEXP);
    } else {
      this.ldy(0);
      this.m[FACOV] = 0;
    }
    this.fadd1();
  }

  private fadd1(): void {
    this.compare(this.a, 0xF9);
    if (this.n) {
      this.shiftr();
    } else {
      this.ldy(this.a);
      this.lda(this.m[FACOV]);
      this.lsr(this.zp(this.x + 1));
      this.rolshf();
    }
    this.fadd4();
  }

  private fadd4(): void {
    this.bit(this.m[ARISGN]);
    if (this.n) {
      this.fadd3();
    } else {
      this.fadd2();
    }
  }

  private fadd3(): void {
    let bigger: number = FACEXP;

    if (this.x !== ARGEXP) {
      bigger = ARGEXP;
    }
    this.y = bigger;
    this.c = true;
    this.eor(0xFF);
    this.adc(this.m[OLDOV]);
    this.sta(FACOV);
    this.lda(this.m[this.zp(this.y + 4)]);
    this.sbc(this.m[this.zp(this.x + 4)]);
    this.sta(FACLO);
    this.lda(this.m[this.zp(this.y + 3)]);
    this.sbc(this.m[this.zp(this.x + 3)]);
    this.sta(FACMO);
    this.lda(this.m[this.zp(this.y + 2)]);
    this.sbc(this.m[this.zp(this.x + 2)]);
    this.sta(FACMOH);
    this.lda(this.m[this.zp(this.y + 1)]);
    this.sbc(this.m[this.zp(this.x + 1)]);
    this.sta(FACHO);
    this.fadflt();
  }

  private fadflt(): void {
    if (!this.c) {
      this.negfac();
    }
    this.normal();
  }

  private normal(): void {
    this.ldy(0);
    this.lda(this.y);
    this.c = false;
    for (;;) {
      this.ldx(this.m[FACHO]);
      if (!this.z) {
        this.norm1();
        return;
      }
      this.ldx(this.m[FACMOH]);
      this.m[FACHO] = this.x;
      this.ldx(this.m[FACMO]);
      this.m[FACMOH] = this.x;
      this.ldx(this.m[FACLO]);
      this.m[FACMO] = this.x;
      this.ldx(this.m[FACOV]);
      this.m[FACLO] = this.x;
      this.m[FACOV] = this.y;
      this.adc(8);
      this.compare(this.a, 0x20);
      if (this.z) {
        this.zerofc();
        return;
      }
    }
  }

  private norm1(): void {
    while (!this.n) {
      this.adc(1);
      this.asl(FACOV);
      this.rol(FACLO);
      this.rol(FACMO);
      this.rol(FACMOH);
      this.rol(FACHO);
    }
    this.c = true;
    this.sbc(this.m[FACEXP]);
    if (this.c) {
      this.zerofc();
    } else {
      this.eor(0xFF);
      this.adc(1);
      this.sta(FACEXP);
      this.squeez();
    }
  }

  private zerofc(): void {
    this.lda(0);
    this.zerof1();
  }

  private zerof1(): void {
    this.sta(FACEXP);
    this.sta(FACSGN);
  }

  private fadd2(): void {
    this.adc(this.m[OLDOV]);
    this.sta(FACOV);
    this.lda(this.m[FACLO]);
    this.adc(this.m[ARGLO]);
    this.sta(FACLO);
    this.lda(this.m[FACMO]);
    this.adc(this.m[ARGMO]);
    this.sta(FACMO);
    this.lda(this.m[FACMOH]);
    this.adc(this.m[ARGMOH]);
    this.sta(FACMOH);
    this.lda(this.m[FACHO]);
    this.adc(this.m[ARGHO]);
    this.sta(FACHO);
    this.squeez();
  }

  private squeez(): void {
    if (this.c) {
      this.rndshf();
    }
  }

  private rndshf(): void {
    this.inc(FACEXP);
    if (this.z) {
      throw new OverflowError();
    }
    this.ror(FACHO);
    this.ror(FACMOH);
    this.ror(FACMO);
    this.ror(FACLO);
    this.ror(FACOV);
  }

  private negfac(): void {
    this.com(FACSGN);
    this.negfch();
  }

  private negfch(): void {
    this.com(FACHO);
    this.com(FACMOH);
    this.com(FACMO);
    this.com(FACLO);
    this.com(FACOV);
    this.inc(FACOV);
    if (this.z) {
      this.incfac();
    }
  }

  private incfac(): void {
    this.inc(FACLO);
    if (this.z) {
      this.inc(FACMO);
      if (this.z) {
        this.inc(FACMOH);
        if (this.z) {
          this.inc(FACHO);
        }
      }
    }
  }

  /** SHIFTR with the byte-shift loop (SHFTR2) folded in. X addresses the operand. */
  private shiftr(): void {
    for (;;) {
      this.adc(8);
      if (this.n || this.z) {
        this.shftr2Bytes();
      } else {
        break;
      }
    }
    this.sbc(8);
    this.ldy(this.a);
    this.lda(this.m[FACOV]);
    if (this.c) {
      this.c = false;
      return;
    }
    this.shftr3();
  }

  private shftr2Bytes(): void {
    const base: number = this.x;

    this.m[FACOV] = this.m[this.zp(base + 4)];
    this.m[this.zp(base + 4)] = this.m[this.zp(base + 3)];
    this.m[this.zp(base + 3)] = this.m[this.zp(base + 2)];
    this.m[this.zp(base + 2)] = this.m[this.zp(base + 1)];
    this.m[this.zp(base + 1)] = this.m[BITS];
    this.y = this.m[BITS];
  }

  private shftr3(): void {
    do {
      this.asl(this.zp(this.x + 1));
      if (this.c) {
        this.inc(this.zp(this.x + 1));
      }
      this.ror(this.zp(this.x + 1));
      this.ror(this.zp(this.x + 1));
      this.rolshfBody();
      this.y = (this.y + 1) & 0xFF;
    } while (this.y !== 0);
    this.c = false;
  }

  /** ROLSHF entered from above: rotate the low three bytes and A, then carry on with SHFTR7. */
  private rolshf(): void {
    this.rolshfBody();
    this.y = (this.y + 1) & 0xFF;
    if (this.y !== 0) {
      this.shftr3();
    } else {
      this.c = false;
    }
  }

  private rolshfBody(): void {
    this.ror(this.zp(this.x + 2));
    this.ror(this.zp(this.x + 3));
    this.ror(this.zp(this.x + 4));
    this.rorA();
  }


  // ---- multiplication and division ----

  public fmult(pointer: number): void {
    this.conupk(pointer);
    this.fmultt();
  }

  public fmultt(): void {
    if (this.m[FACEXP] === 0) {
      return;
    }
    if (!this.muldiv()) {
      return;
    }
    this.lda(0);
    this.sta(RESHO);
    this.sta(RESMOH);
    this.sta(RESMO);
    this.sta(RESLO);
    this.lda(this.m[FACOV]);
    this.mltply();
    this.lda(this.m[FACLO]);
    this.mltply();
    this.lda(this.m[FACMO]);
    this.mltply();
    this.lda(this.m[FACMOH]);
    this.mltply();
    this.lda(this.m[FACHO]);
    this.mltpl1();
    this.movfr();
  }

  private mltply(): void {
    if (this.z) {
      this.ldx(RESHO - 1);
      this.shftr2Bytes();
      this.shiftr();
    } else {
      this.mltpl1();
    }
  }

  private mltpl1(): void {
    this.lsrA();
    this.ora(0x80);
    do {
      this.ldy(this.a);
      if (this.c) {
        this.c = false;
        this.lda(this.m[RESLO]);
        this.adc(this.m[ARGLO]);
        this.sta(RESLO);
        this.lda(this.m[RESMO]);
        this.adc(this.m[ARGMO]);
        this.sta(RESMO);
        this.lda(this.m[RESMOH]);
        this.adc(this.m[ARGMOH]);
        this.sta(RESMOH);
        this.lda(this.m[RESHO]);
        this.adc(this.m[ARGHO]);
        this.sta(RESHO);
      }
      this.ror(RESHO);
      this.ror(RESMOH);
      this.ror(RESMO);
      this.ror(RESLO);
      this.ror(FACOV);
      this.lda(this.y);
      this.lsrA();
    } while (!this.z);
  }

  private conupk(pointer: number): void {
    this.lda(this.m[pointer + 4]);
    this.sta(ARGLO);
    this.lda(this.m[pointer + 3]);
    this.sta(ARGMO);
    this.lda(this.m[pointer + 2]);
    this.sta(ARGMOH);
    this.lda(this.m[pointer + 1]);
    this.sta(ARGSGN);
    this.eor(this.m[FACSGN]);
    this.sta(ARISGN);
    this.lda(this.m[ARGSGN]);
    this.ora(0x80);
    this.sta(ARGHO);
    this.lda(this.m[pointer]);
    this.sta(ARGEXP);
    this.lda(this.m[FACEXP]);
  }

  /** MULDIV; false where the original pops its caller's return address (underflow to zero). */
  private muldiv(): boolean {
    this.lda(this.m[ARGEXP]);

    return this.mldexp();
  }

  private mldexp(): boolean {
    if (this.z) {
      this.zerofc();
      return false;
    }
    this.c = false;
    this.adc(this.m[FACEXP]);
    if (this.c) {
      if (this.n) {
        throw new OverflowError();
      }
      this.c = false;
    } else if (!this.n) {
      this.zerofc();
      return false;
    }
    this.adc(0x80);
    this.sta(FACEXP);
    if (this.z) {
      this.sta(FACSGN);
      return true;
    }
    this.lda(this.m[ARISGN]);
    this.sta(FACSGN);
    return true;
  }

  private mldvex(): boolean {
    this.lda(this.m[FACSGN]);
    this.eor(0xFF);
    if (this.n) {
      throw new OverflowError();
    }
    this.zerofc();
    return false;
  }

  public mul10(): void {
    this.movaf();
    this.ldx(this.a);
    if (this.z) {
      return;
    }
    this.c = false;
    this.adc(2);
    if (this.c) {
      throw new OverflowError();
    }
    this.ldx(0);
    this.m[ARISGN] = 0;
    this.faddc();
    this.inc(FACEXP);
    if (this.z) {
      throw new OverflowError();
    }
  }

  public div10(): void {
    this.movaf();
    this.ldx(0);
    this.m[ARISGN] = this.x;
    this.movfm(K['TENZC']);
    this.fdivt();
  }

  public fdiv(pointer: number): void {
    this.conupk(pointer);
    this.fdivt();
  }

  public fdivt(): void {
    if (this.m[FACEXP] === 0) {
      throw new DivisionByZeroError();
    }
    this.round();
    this.lda(0);
    this.c = true;
    this.sbc(this.m[FACEXP]);
    this.sta(FACEXP);
    if (!this.muldiv()) {
      return;
    }
    this.inc(FACEXP);
    if (this.z) {
      throw new OverflowError();
    }
    this.ldx(0xFC);
    this.lda(1);
    this.divide();
  }

  private divide(): void {
    let state: 'compare' | 'save' = 'compare';

    for (;;) {
      if (state === 'compare') {
        this.compareMantissas();
      }
      this.php();
      this.rolA();
      if (this.c) {
        this.x = (this.x + 1) & 0xFF;
        this.m[this.zp(RESLO + this.x)] = this.a;
        if (this.x === 0) {
          this.lda(0x40);
        } else if (this.x < 0x80) {
          this.divnrm();
          return;
        } else {
          this.lda(1);
        }
      }
      this.plp();
      if (this.c) {
        this.divsub();
      }
      this.asl(ARGLO);
      this.rol(ARGMO);
      this.rol(ARGMOH);
      this.rol(ARGHO);
      if (this.c) {
        state = 'save';
      } else if (this.n) {
        state = 'compare';
      } else {
        state = 'save';
      }
    }
  }

  private compareMantissas(): void {
    const pairs: readonly (readonly [ number, number ])[] = [ [ ARGHO, FACHO ], [ ARGMOH, FACMOH ], [ ARGMO, FACMO ], [ ARGLO, FACLO ] ];

    for (const [ left, right ] of pairs) {
      this.compare(this.m[left], this.m[right]);
      if (!this.z) {
        return;
      }
    }
  }

  private divsub(): void {
    const quotient: number = this.a;

    this.lda(this.m[ARGLO]);
    this.sbc(this.m[FACLO]);
    this.sta(ARGLO);
    this.lda(this.m[ARGMO]);
    this.sbc(this.m[FACMO]);
    this.sta(ARGMO);
    this.lda(this.m[ARGMOH]);
    this.sbc(this.m[FACMOH]);
    this.sta(ARGMOH);
    this.lda(this.m[ARGHO]);
    this.sbc(this.m[FACHO]);
    this.sta(ARGHO);
    this.a = quotient;
  }

  private divnrm(): void {
    for (let shift: number = 0; shift < 6; shift++) {
      this.aslA();
    }
    this.sta(FACOV);
    this.plp();
    this.movfr();
  }

  private movfr(): void {
    this.m[FACHO] = this.m[RESHO];
    this.m[FACMOH] = this.m[RESMOH];
    this.m[FACMO] = this.m[RESMO];
    this.lda(this.m[RESLO]);
    this.sta(FACLO);
    this.normal();
  }


  // ---- movement ----

  public movfm(pointer: number): void {
    this.m[FACLO] = this.m[pointer + 4];
    this.m[FACMO] = this.m[pointer + 3];
    this.m[FACMOH] = this.m[pointer + 2];
    this.lda(this.m[pointer + 1]);
    this.sta(FACSGN);
    this.ora(0x80);
    this.sta(FACHO);
    this.lda(this.m[pointer]);
    this.sta(FACEXP);
    this.y = 0;
    this.m[FACOV] = 0;
  }

  public movmf(pointer: number): void {
    this.round();
    this.m[pointer + 4] = this.m[FACLO];
    this.m[pointer + 3] = this.m[FACMO];
    this.m[pointer + 2] = this.m[FACMOH];
    this.m[pointer + 1] = (this.m[FACSGN] | 0x7F) & this.m[FACHO];
    this.m[pointer] = this.m[FACEXP];
    this.y = 0;
    this.m[FACOV] = 0;
  }

  private movfa(): void {
    this.lda(this.m[ARGSGN]);
    this.movfa1();
  }

  private movfa1(): void {
    this.sta(FACSGN);
    for (let offset: number = 4; offset >= 0; offset--) {
      this.lda(this.m[ARGEXP + offset]);
      this.m[FACEXP + offset] = this.a;
    }
    this.x = 0;
    this.m[FACOV] = 0;
  }

  public movaf(): void {
    this.round();
    this.movef();
  }

  private movef(): void {
    for (let offset: number = 5; offset >= 0; offset--) {
      this.lda(this.m[FACEXP + offset]);
      this.m[ARGEXP + offset] = this.a;
    }
    this.x = 0;
    this.m[FACOV] = 0;
  }

  public round(): void {
    if (this.m[FACEXP] === 0) {
      return;
    }
    this.asl(FACOV);
    if (this.c) {
      this.incrnd();
    }
  }

  private incrnd(): void {
    this.incfac();
    if (this.z) {
      this.rndshf();
    }
  }


  // ---- sign, float, compare, integers ----

  public sign(): number {
    this.lda(this.m[FACEXP]);
    if (!this.z) {
      this.fcsign();
    }
    return this.a;
  }

  private fcsign(): void {
    this.lda(this.m[FACSGN]);
    this.fcomps();
  }

  private fcomps(): void {
    this.rolA();
    if (this.c) {
      this.lda(0xFF);
    } else {
      this.lda(1);
    }
  }

  public sgn(): void {
    this.sign();
    this.float();
  }

  private float(): void {
    this.sta(FACHO);
    this.lda(0);
    this.sta(FACMOH);
    this.ldx(0x88);
    this.lda(this.m[FACHO]);
    this.eor(0xFF);
    this.rolA();
    this.lda(0);
    this.sta(FACLO);
    this.sta(FACMO);
    this.m[FACEXP] = this.x;
    this.sta(FACOV);
    this.sta(FACSGN);
    this.fadflt();
  }

  public abs(): void {
    this.lsr(FACSGN);
  }

  /** FCOMP: 1 if the number at pointer is less than FAC, 0 if equal, 255 if greater. */
  public fcomp(pointer: number): number {
    this.y = 0;
    this.lda(this.m[pointer]);
    this.y = 1;
    this.ldx(this.a);
    if (this.z) {
      return this.sign();
    }
    this.lda(this.m[pointer + 1]);
    this.eor(this.m[FACSGN]);
    if (this.n) {
      this.fcsign();
      return this.a;
    }
    let equal: boolean = false;

    this.compare(this.x, this.m[FACEXP]);
    if (this.z) {
      this.lda(this.m[pointer + 1]);
      this.ora(0x80);
      this.compare(this.a, this.m[FACHO]);
      if (this.z) {
        this.y = 2;
        this.lda(this.m[pointer + 2]);
        this.compare(this.a, this.m[FACMOH]);
        if (this.z) {
          this.y = 3;
          this.lda(this.m[pointer + 3]);
          this.compare(this.a, this.m[FACMO]);
          if (this.z) {
            this.y = 4;
            this.lda(0x7F);
            this.compare(this.a, this.m[FACOV]);
            this.lda(this.m[pointer + 4]);
            this.sbc(this.m[FACLO]);
            equal = this.z;
          }
        }
      }
    }
    if (!equal) {
      this.lda(this.m[FACSGN]);
      if (this.c) {
        this.eor(0xFF);
      }
      this.fcomps();
    }
    return this.a;
  }

  public qint(): void {
    this.lda(this.m[FACEXP]);
    if (this.z) {
      this.sta(FACHO);
      this.sta(FACMOH);
      this.sta(FACMO);
      this.sta(FACLO);
      this.y = this.a;
      return;
    }
    this.c = true;
    this.sbc(0xA0);
    this.bit(this.m[FACSGN]);
    if (this.n) {
      this.ldx(this.a);
      this.lda(0xFF);
      this.sta(BITS);
      this.negfch();
      this.lda(this.x);
    }
    this.ldx(FACEXP);
    this.compare(this.a, 0xF9);
    if (this.n) {
      this.shiftr();
      this.m[BITS] = this.y;
    } else {
      this.ldy(this.a);
      this.lda(this.m[FACSGN]);
      this.and(0x80);
      this.lsr(FACHO);
      this.ora(this.m[FACHO]);
      this.sta(FACHO);
      this.rolshf();
      this.m[BITS] = this.y;
    }
  }

  public int(): void {
    this.lda(this.m[FACEXP]);
    this.compare(this.a, 0xA0);
    if (this.c) {
      return;
    }
    this.qint();
    this.m[FACOV] = this.y;
    this.lda(this.m[FACSGN]);
    this.m[FACSGN] = this.y;
    this.eor(0x80);
    this.rolA();
    this.lda(0xA0);
    this.sta(FACEXP);
    this.lda(this.m[FACLO]);
    this.sta(INTEGR);
    this.fadflt();
  }

  public negop(): void {
    this.lda(this.m[FACEXP]);
    if (!this.z) {
      this.com(FACSGN);
    }
  }


  // ---- input and output ----

  /** FIN, from text that starts at the number. */
  public fin(text: string): void {
    this.text = text;
    this.textIndex = -1;
    this.chrget();
    this.finAt();
  }

  private chrget(): void {
    let code: number;

    do {
      this.textIndex = this.textIndex + 1;
      code = this.textIndex < this.text.length ? this.text.charCodeAt(this.textIndex) : 0;
    } while (code === 0x20);
    this.lda(code);
    if (code >= 0x3A) {
      this.c = true;
    } else {
      this.c = true;
      this.sbc(0x30);
      this.c = true;
      this.sbc(0xD0);
    }
  }

  private finAt(): void {
    this.ldy(0);
    for (let offset: number = 10; offset >= 0; offset--) {
      this.m[DECCNT + offset] = 0;
    }
    this.x = 0xFF;
    let digit: boolean = !this.c;

    if (!digit) {
      if (this.a === 0x2D) {
        this.m[SGNFLG] = 0xFF;
        this.chrget();
      } else if (this.a === 0x2B) {
        this.chrget();
      }
      digit = !this.c;
    }
    for (;;) {
      if (digit) {
        this.findig();
        this.chrget();
        digit = !this.c;
      } else if (this.a === 0x2E) {
        this.c = true;
        this.ror(DPTFLG);
        this.bit(this.m[DPTFLG]);
        if (this.v) {
          this.fine(this.m[TENEXP]);
          return;
        }
        this.chrget();
        digit = !this.c;
      } else if (this.a === 0x45) {
        this.finExponent();
        return;
      } else {
        this.fine(this.m[TENEXP]);
        return;
      }
    }
  }

  private findig(): void {
    const character: number = this.a;

    this.bit(this.m[DPTFLG]);
    if (this.n) {
      this.inc(DECCNT);
    }
    this.mul10();
    this.lda(character);
    this.c = true;
    this.sbc(0x30);
    this.finlog();
  }

  private finlog(): void {
    const value: number = this.a;

    this.movaf();
    this.lda(value);
    this.float();
    this.lda(this.m[ARGSGN]);
    this.eor(this.m[FACSGN]);
    this.sta(ARISGN);
    this.ldx(this.m[FACEXP]);
    this.faddt();
  }

  private finExponent(): void {
    this.chrget();
    if (this.c) {
      if (this.a === 0xC9 || this.a === 0x2D) {
        this.c = true;
        this.ror(EXPSGN);
        this.chrget();
      } else if (this.a === 0xC8 || this.a === 0x2B) {
        this.chrget();
      }
    }
    while (!this.c) {
      this.finedg();
      this.chrget();
    }
    this.bit(this.m[EXPSGN]);
    if (this.n) {
      this.lda(0);
      this.c = true;
      this.sbc(this.m[TENEXP]);
      this.fine(this.a);
    } else {
      this.fine(this.m[TENEXP]);
    }
  }

  private finedg(): void {
    const character: number = this.text.charCodeAt(this.textIndex);

    this.lda(this.m[TENEXP]);
    this.compare(this.a, 10);
    if (this.c) {
      this.lda(100);
      this.bit(this.m[EXPSGN]);
      if (!this.n) {
        throw new OverflowError();
      }
    } else {
      this.aslA();
      this.aslA();
      this.c = false;
      this.adc(this.m[TENEXP]);
      this.aslA();
      this.c = false;
      this.adc(character);
      this.c = true;
      this.sbc(0x30);
    }
    this.sta(TENEXP);
  }

  private fine(exponent: number): void {
    this.lda(exponent);
    this.c = true;
    this.sbc(this.m[DECCNT]);
    this.sta(TENEXP);
    if (!this.z) {
      if (this.n) {
        do {
          this.div10();
          this.inc(TENEXP);
        } while (!this.z);
      } else {
        do {
          this.mul10();
          this.dec(TENEXP);
        } while (!this.z);
      }
    }
    if ((this.m[SGNFLG] & 0x80) !== 0) {
      this.negop();
    }
  }

  /** FOUT as Applesoft's STR$ and PRINT see it: Microsoft's, less the leading space. */
  public fout(): string {
    this.ldy(1);
    this.lda(0x20);
    this.bit(this.m[FACSGN]);
    if (this.n) {
      this.lda(0x2D);
    }
    this.m[FBUFFR + this.y - 1] = this.a;
    this.sta(FACSGN);
    this.m[FBUFPT] = this.y;
    this.y = this.y + 1;
    this.lda(0x30);
    this.ldx(this.m[FACEXP]);
    if (this.z) {
      this.m[FBUFFR + this.y - 1] = this.a;
      this.m[FBUFFR + this.y] = 0;
    } else {
      this.foutDigits();
    }

    return this.bufferText();
  }

  private foutDigits(): void {
    this.lda(0);
    this.compare(this.x, 0x80);
    if (this.z || !this.c) {
      this.fmult(K['NZMIL']);
      this.lda(0xF7);
    }
    this.sta(DECCNT);
    let round: boolean = true;
    let scaling: 'big' | 'small' = 'big';

    for (;;) {
      if (scaling === 'big') {
        const big: number = this.fcomp(K['NZ9999']);

        if (big === 0) {
          round = false;
          break;
        } else if (big < 0x80) {
          this.div10();
          this.inc(DECCNT);
          continue;
        }
        scaling = 'small';
      }
      const small: number = this.fcomp(K['NZ0999']);

      if ((small !== 0) && (small < 0x80)) {
        break;
      }
      this.mul10();
      this.dec(DECCNT);
    }
    if (round) {
      this.faddh();
    }
    this.qint();
    this.foutLayout();
  }

  private foutLayout(): void {
    this.ldx(1);
    this.lda(this.m[DECCNT]);
    this.c = false;
    this.adc(10);
    let exponentOnly: boolean = this.n;

    if (!exponentOnly) {
      this.compare(this.a, 11);
      if (this.c) {
        exponentOnly = true;
        this.sbc(2);
      } else {
        this.adc(0xFF);
        this.ldx(this.a);
        this.lda(2);
        this.c = true;
        this.sbc(2);
      }
    } else {
      this.c = true;
      this.sbc(2);
    }
    this.sta(TENEXP);
    this.m[DECCNT] = this.x;
    this.lda(this.x);
    if (this.z || this.n) {
      this.ldy(this.m[FBUFPT]);
      this.lda(0x2E);
      this.y = this.y + 1;
      this.m[FBUFFR + this.y - 1] = this.a;
      this.lda(this.x);
      if (!this.z) {
        this.lda(0x30);
        this.y = this.y + 1;
        this.m[FBUFFR + this.y - 1] = this.a;
      }
      this.m[FBUFPT] = this.y;
    }
    this.foutDigitLoop();
    this.foutTrim();
  }

  private foutDigitLoop(): void {
    let table: number = 0;
    let direction: number = 0x80;

    while (table < 36) {
      this.x = direction;
      let more: boolean = true;

      while (more) {
        this.lda(this.m[FACLO]);
        this.c = false;
        this.adc(this.m[K['FOUTBL'] + table + 3]);
        this.sta(FACLO);
        this.lda(this.m[FACMO]);
        this.adc(this.m[K['FOUTBL'] + table + 2]);
        this.sta(FACMO);
        this.lda(this.m[FACMOH]);
        this.adc(this.m[K['FOUTBL'] + table + 1]);
        this.sta(FACMOH);
        this.lda(this.m[FACHO]);
        this.adc(this.m[K['FOUTBL'] + table]);
        this.sta(FACHO);
        this.x = (this.x + 1) & 0xFF;
        const negative: boolean = (this.x & 0x80) !== 0;

        more = this.c ? negative : !negative;
      }
      this.lda(this.x);
      if (this.c) {
        this.eor(0xFF);
        this.adc(10);
      }
      this.adc(0x2F);
      table = table + 4;
      this.ldy(this.m[FBUFPT]);
      this.y = this.y + 1;
      this.ldx(this.a);
      this.and(0x7F);
      this.m[FBUFFR + this.y - 1] = this.a;
      this.dec(DECCNT);
      if (this.z) {
        this.lda(0x2E);
        this.y = this.y + 1;
        this.m[FBUFFR + this.y - 1] = this.a;
      }
      this.m[FBUFPT] = this.y;
      this.lda(this.x);
      this.eor(0xFF);
      this.and(0x80);
      direction = this.a;
    }
  }

  private foutTrim(): void {
    this.ldy(this.m[FBUFPT]);
    let character: number;

    do {
      character = this.m[FBUFFR + this.y - 1];
      this.y = this.y - 1;
    } while (character === 0x30);
    if (character !== 0x2E) {
      this.y = this.y + 1;
    }
    this.lda(0x2B);
    this.ldx(this.m[TENEXP]);
    if (this.z) {
      this.m[FBUFFR + this.y] = 0;
      return;
    }
    if (this.n) {
      this.lda(0);
      this.c = true;
      this.sbc(this.m[TENEXP]);
      this.ldx(this.a);
      this.lda(0x2D);
    }
    this.m[FBUFFR + this.y + 1] = this.a;
    this.m[FBUFFR + this.y] = 0x45;
    this.lda(this.x);
    this.ldx(0x2F);
    this.c = true;
    do {
      this.x = this.x + 1;
      this.sbc(10);
    } while (this.c);
    this.adc(0x3A);
    this.m[FBUFFR + this.y + 3] = this.a;
    this.m[FBUFFR + this.y + 2] = this.x;
    this.m[FBUFFR + this.y + 4] = 0;
  }

  private bufferText(): string {
    let text: string = '';

    for (let offset: number = 0; this.m[FBUFFR + offset] !== 0; offset++) {
      text = text + String.fromCharCode(this.m[FBUFFR + offset]);
    }

    return text.startsWith(' ') ? text.substring(1) : text;
  }


  // ---- transcendental functions ----

  public sqr(): void {
    this.movaf();
    this.movfm(K['FHALF']);
    this.fpwrt();
  }

  /** FPWRT: ARG ^ FAC. */
  public fpwrt(): void {
    if (this.m[FACEXP] === 0) {
      this.exp();
      return;
    }
    if (this.m[ARGEXP] === 0) {
      this.lda(0);
      this.zerof1();
      return;
    }
    this.movmf(TEMPF3);
    this.lda(this.m[ARGSGN]);
    if (this.n) {
      this.int();
      const same: number = this.fcomp(TEMPF3);

      if (same === 0) {
        this.lda(this.y);
        this.ldy(this.m[INTEGR]);
      }
    }
    this.movfa1();
    this.lda(this.y);
    const evenness: number = this.a;

    this.log();
    this.fmult(TEMPF3);
    this.exp();
    if ((evenness & 1) !== 0) {
      this.negop();
    }
  }

  public log(): void {
    this.sign();
    if (this.z || this.n) {
      throw new IllegalQuantityError();
    }
    this.lda(this.m[FACEXP]);
    this.sbc(0x7F);
    const exponent: number = this.a;

    this.lda(0x80);
    this.sta(FACEXP);
    this.fadd(K['SQRHLF']);
    this.fdiv(K['SQRTWO']);
    this.fsub(K['FONE']);
    this.polyx(K['LOGCN2']);
    this.fadd(K['NEGHLF']);
    this.lda(exponent);
    this.finlog();
    this.fmult(K['LOG2']);
  }

  public exp(): void {
    this.fmult(K['LOGEB2']);
    this.lda(this.m[FACOV]);
    this.adc(0x50);
    if (this.c) {
      this.incrnd();
    }
    this.sta(OLDOV);
    this.movef();
    this.lda(this.m[FACEXP]);
    this.compare(this.a, 0x88);
    if (this.c && !this.mldvex()) {
      return;
    }
    this.int();
    this.lda(this.m[INTEGR]);
    this.c = false;
    this.adc(0x81);
    if (this.z && !this.mldvex()) {
      return;
    }
    this.c = true;
    this.sbc(1);
    const scale: number = this.a;

    for (let offset: number = 5; offset >= 0; offset--) {
      const argument: number = this.m[ARGEXP + offset];

      this.m[ARGEXP + offset] = this.m[FACEXP + offset];
      this.m[FACEXP + offset] = argument;
    }
    this.lda(this.m[OLDOV]);
    this.sta(FACOV);
    this.fsubt();
    this.negop();
    this.poly1(K['EXPCON']);
    this.m[ARISGN] = 0;
    this.lda(scale);
    this.mldexp();
  }

  private polyx(pointer: number): void {
    this.movmf(TEMPF1);
    this.fmult(TEMPF1);
    this.poly1(pointer);
    this.fmult(TEMPF1);
  }

  private poly1(pointer: number): void {
    let degree: number = this.m[pointer];
    let coefficient: number = pointer + 1;

    this.movmf(TEMPF2);
    this.fmult(coefficient);
    for (;;) {
      coefficient = coefficient + 5;
      this.fadd(coefficient);
      degree = degree - 1;
      if (degree === 0) {
        return;
      }
      this.fmult(TEMPF2);
    }
  }

  public atn(): void {
    const sign: number = this.m[FACSGN];

    if ((sign & 0x80) !== 0) {
      this.negop();
    }
    const exponent: number = this.m[FACEXP];

    if (exponent >= 0x81) {
      this.fdiv(K['FONE']);
    }
    this.polyx(K['ATNCON']);
    if (exponent >= 0x81) {
      this.fsub(K['PI2']);
    }
    if ((sign & 0x80) !== 0) {
      this.negop();
    }
  }


  // ---- the random number generator ----

  public rnd(): void {
    this.sign();
    this.ldx(this.a);
    if (!this.n) {
      this.movfm(RNDX);
      if (this.x === 0) {
        return;
      }
      this.fmult(K['RMULZC']);
      this.fadd(K['RADDZC']);
    }
    const lo: number = this.m[FACLO];

    this.m[FACLO] = this.m[FACHO];
    this.m[FACHO] = lo;
    this.m[FACSGN] = 0;
    this.m[FACOV] = this.m[FACEXP];
    this.m[FACEXP] = 0x80;
    this.normal();
    this.movmf(RNDX);
  }

}
