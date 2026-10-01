import type { IApplePalette, IRgb } from './apple-palette';
import { artifactColor } from './apple-palette';
import { BYTES_PER_ROW, HIRES_BYTES, HIRES_HEIGHT, HIRES_WIDTH, PIXELS_PER_BYTE, hiresRowOffset } from './apple-hires.constants';
import { IllegalQuantityError } from './applesoft-errors';
import { getadr, getbyt } from './applesoft-numbers';


/** HCOLOR= patterns, from the ROM's COLORTBL. */
const COLOR_TABLE: readonly number[] = [ 0x00, 0x2A, 0x55, 0x7F, 0x80, 0xAA, 0xD5, 0xFF ];

/** The patterns COLOR.SHIFT flips on odd bytes; the others survive its rotate unchanged. */
const SHIFTING_PATTERNS: readonly number[] = [ 0x2A, 0x55 ];


export interface IHiresPoint {
  readonly x: number;
  readonly y: number;
}


/**
 * The Applesoft hi-res screen as its 8 KB of video memory, driven the way the ROM's HPOSN, HPLOT0,
 * HGLIN and HCLR drive it (`applesoft.m4` in cmosher01/Apple-II-Source).
 */
export class HiresScreen {
  private readonly memory: Uint8Array = new Uint8Array(HIRES_BYTES);

  private color: number = 0;
  private cursorX: number = 0;
  private cursorY: number = 0;

  public dirty: boolean = true;


  public get bytes(): Uint8Array {
    return this.memory;
  }


  public get cursor(): IHiresPoint {
    return { x: this.cursorX, y: this.cursorY };
  }


  public hclr(): void {
    this.memory.fill(0);
    this.dirty = true;
  }


  public hcolor(value: number): void {
    const index: number = getbyt('HCOLOR', value);

    if (index < COLOR_TABLE.length) {
      this.color = COLOR_TABLE[index];
    } else {
      throw new IllegalQuantityError('HCOLOR', value);
    }
  }


  /** HPLOT X,Y */
  public hplot(x: number, y: number): void {
    const point: IHiresPoint = HiresScreen.hfns(x, y);

    this.moveTo(point);
    this.plot(point.x, point.y);
    this.dirty = true;
  }


  /** HPLOT TO X,Y: HGLIN, a four-connected line of |dx| + |dy| + 1 dots from the last point. */
  public hplotTo(x: number, y: number): void {
    const target: IHiresPoint = HiresScreen.hfns(x, y);
    const deltaX: number = Math.abs(target.x - this.cursorX);
    const deltaY: number = Math.abs(target.y - this.cursorY);
    const stepX: number = Math.sign(target.x - this.cursorX);
    const stepY: number = Math.sign(target.y - this.cursorY);
    let plotX: number = this.cursorX;
    let plotY: number = this.cursorY;
    let error: number = deltaX - deltaY;

    for (let dots: number = deltaX + deltaY + 1; dots > 0; dots--) {
      this.plot(plotX, plotY);

      if (error >= 0) {
        plotX = plotX + stepX;
        error = error - deltaY;
      } else {
        plotY = plotY + stepY;
        error = error + deltaX;
      }
    }

    this.moveTo(target);
    this.dirty = true;
  }


  public isLit(x: number, y: number): boolean {
    return (this.memory[hiresRowOffset(y) + Math.floor(x / PIXELS_PER_BYTE)] & (1 << (x % PIXELS_PER_BYTE))) !== 0;
  }


  /** Paints 280 x 192 pixels of RGBA, colouring each pixel by its neighbours, column and palette bit. */
  public render(target: Uint8ClampedArray, palette: IApplePalette, rows: number = HIRES_HEIGHT): void {
    const lit: boolean[] = new Array<boolean>(HIRES_WIDTH);
    const paletteBits: boolean[] = new Array<boolean>(HIRES_WIDTH);

    for (let pixelRow: number = 0; pixelRow < rows; pixelRow++) {
      const rowBase: number = hiresRowOffset(pixelRow);

      for (let byteIndex: number = 0; byteIndex < BYTES_PER_ROW; byteIndex++) {
        const value: number = this.memory[rowBase + byteIndex];

        for (let bit: number = 0; bit < PIXELS_PER_BYTE; bit++) {
          const column: number = (byteIndex * PIXELS_PER_BYTE) + bit;

          lit[column] = (value & (1 << bit)) !== 0;
          paletteBits[column] = (value & 0x80) !== 0;
        }
      }

      for (let column: number = 0; column < HIRES_WIDTH; column++) {
        const leftLit: boolean = (column > 0) && lit[column - 1];
        const rightLit: boolean = (column < (HIRES_WIDTH - 1)) && lit[column + 1];
        const color: IRgb = artifactColor(palette, lit[column], leftLit, rightLit, column, paletteBits[column]);
        const index: number = ((pixelRow * HIRES_WIDTH) + column) * 4;

        target[index] = color.r;
        target[index + 1] = color.g;
        target[index + 2] = color.b;
        target[index + 3] = 255;
      }
    }
  }


  /** '#' for lit and '.' for dark, one string per pixel row, for specs. */
  public toAscii(left: number, top: number, width: number, height: number): string[] {
    const rows: string[] = [];

    for (let pixelRow: number = top; pixelRow < (top + height); pixelRow++) {
      let line: string = '';

      for (let column: number = left; column < (left + width); column++) {
        line = line + (this.isLit(column, pixelRow) ? '#' : '.');
      }

      rows.push(line);
    }

    return rows;
  }


  /** HFNS: X through GETADR and below 280, Y through GETBYT and below 192. */
  private static hfns(x: number, y: number): IHiresPoint {
    const column: number = getadr('HPLOT X', x);
    const row: number = getbyt('HPLOT Y', y);

    if ((column < HIRES_WIDTH) && (row < HIRES_HEIGHT)) {
      return { x: column, y: row };
    } else {
      throw new IllegalQuantityError('HPLOT', (column < HIRES_WIDTH) ? y : x);
    }
  }


  private moveTo(point: IHiresPoint): void {
    this.cursorX = point.x;
    this.cursorY = point.y;
  }


  /** HPLOT0's store: every bit under the mask, palette bit included, takes the colour's bit. */
  private plot(x: number, y: number): void {
    const byteIndex: number = Math.floor(x / PIXELS_PER_BYTE);
    const offset: number = hiresRowOffset(y) + byteIndex;
    const mask: number = 0x80 | (1 << (x % PIXELS_PER_BYTE));
    const bits: number = this.colorBitsForByte(byteIndex);
    const current: number = this.memory[offset];

    this.memory[offset] = ((current ^ bits) & mask) ^ current;
  }


  private colorBitsForByte(byteIndex: number): number {
    const shifts: boolean = ((byteIndex & 1) === 1) && SHIFTING_PATTERNS.includes(this.color & 0x7F);

    return shifts ? this.color ^ 0x7F : this.color;
  }

}
