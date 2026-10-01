import { TEXT_COLUMNS, TEXT_ROWS } from './apple-hires.constants';
import { IllegalQuantityError } from './applesoft-errors';
import { getbyt } from './applesoft-numbers';

// The 40 x 24 text page with the Monitor's scrolling window (WNDLFT, WNDWDTH, WNDTOP, WNDBTM at
// $20-$23) and Applesoft's PRINT, HTAB, VTAB, TAB(, comma and INVERSE on top of it. Cells hold
// screen codes as the hardware does: $A0-$DF normal, $00-$3F inverse.

const BLANK: number = 0xA0;
const NORMAL_MASK: number = 0xFF;
const INVERSE_MASK: number = 0x3F;

const CONTROL_RETURN: number = 0x8D;
const CONTROL_LINE_FEED: number = 0x8A;
const CONTROL_BACKSPACE: number = 0x88;
const CONTROL_BELL: number = 0x87;

/** PR.COMMA's bug: it should be 32, so a comma from column 24 to 31 starts a new line. */
const LAST_COMMA_COLUMN: number = 24;


export class TextScreen {
  private readonly cells: Uint8Array = new Uint8Array(TEXT_COLUMNS * TEXT_ROWS).fill(BLANK);

  private windowLeft: number = 0;
  private windowWidth: number = TEXT_COLUMNS;
  private windowTop: number = 0;
  private windowBottom: number = TEXT_ROWS;

  private ch: number = 0;
  private cv: number = 0;
  private inverseMask: number = NORMAL_MASK;

  public bells: number = 0;
  public dirty: boolean = true;


  public get cursorColumn(): number {
    return this.ch;
  }


  public get cursorRow(): number {
    return this.cv;
  }


  public get windowLeftEdge(): number {
    return this.windowLeft;
  }


  public get windowWidthInColumns(): number {
    return this.windowWidth;
  }


  public get windowTopRow(): number {
    return this.windowTop;
  }


  public get windowBottomRow(): number {
    return this.windowBottom;
  }


  public setWindowLeft(value: number): void {
    this.windowLeft = value;
  }


  public setWindowWidth(value: number): void {
    this.windowWidth = value;
  }


  public setWindowTop(value: number): void {
    this.windowTop = value;
  }


  public setWindowBottom(value: number): void {
    this.windowBottom = value;
  }


  /** SETTXT's window reset: full screen, cursor to row 24. */
  public resetWindow(): void {
    this.windowLeft = 0;
    this.windowWidth = TEXT_COLUMNS;
    this.windowTop = 0;
    this.windowBottom = TEXT_ROWS;
    this.cv = TEXT_ROWS - 1;
  }


  public home(): void {
    this.cv = this.windowTop;
    this.ch = 0;
    this.clearRows(this.windowTop, 0);
  }


  public vtab(value: number): void {
    const row: number = getbyt('VTAB', value) - 1;

    if ((row >= 0) && (row < TEXT_ROWS)) {
      this.cv = row;
    } else {
      throw new IllegalQuantityError('VTAB', value);
    }
  }


  public htab(value: number): void {
    let column: number = (getbyt('HTAB', value) + 255) & 0xFF;

    while (column >= TEXT_COLUMNS) {
      column = column - TEXT_COLUMNS;
      this.crdo();
    }

    this.ch = column;
  }


  public inverse(): void {
    this.inverseMask = INVERSE_MASK;
  }


  public normal(): void {
    this.inverseMask = NORMAL_MASK;
  }


  /** PRINT of a string, character by character through OUTDO. */
  public print(text: string): void {
    for (const character of text) {
      this.outdo(character.charCodeAt(0));
    }

    this.dirty = true;
  }


  public crdo(): void {
    this.outdo(0x0D);
    this.dirty = true;
  }


  /** A comma in a PRINT list. */
  public comma(): void {
    if (this.ch < LAST_COMMA_COLUMN) {
      this.ch = (this.ch + 16) & 0xF0;
    } else {
      this.crdo();
    }
  }


  /** TAB( in a PRINT list: spaces up to the column, or nothing when already past it. TAB(0) means 256. */
  public tab(value: number): void {
    const spaces: number = ((getbyt('TAB', value) + 255) & 0xFF) - this.ch;

    for (let count: number = 0; count < spaces; count++) {
      this.outdo(0x20);
    }

    this.dirty = true;
  }


  /** CLREOL ($FC9C, CALL -868): blanks from the cursor to the right edge of the window. */
  public clearToEndOfLine(): void {
    this.clearLine(this.cv, this.ch);
    this.dirty = true;
  }


  public character(column: number, row: number): string {
    return TextScreen.characterOf(this.cells[(row * TEXT_COLUMNS) + column]);
  }


  public isInverse(column: number, row: number): boolean {
    return this.cells[(row * TEXT_COLUMNS) + column] < 0x40;
  }


  public screenCode(column: number, row: number): number {
    return this.cells[(row * TEXT_COLUMNS) + column];
  }


  public line(row: number): string {
    let text: string = '';

    for (let column: number = 0; column < TEXT_COLUMNS; column++) {
      text = text + this.character(column, row);
    }

    return text;
  }


  public toString(): string {
    return Array.from({ length: TEXT_ROWS }, (_: unknown, row: number): string => this.line(row)).join('\n');
  }


  /** The character a screen code shows: the low six bits pick from @A-Z[\]^_ then space to ?. */
  public static characterOf(code: number): string {
    const low: number = code & 0x3F;

    return String.fromCharCode((low < 0x20) ? low + 0x40 : low);
  }


  private outdo(ascii: number): void {
    const code: number = ascii | 0x80;

    if (code >= 0xA0) {
      this.storeAndAdvance(code & this.inverseMask);
    } else if (code === CONTROL_RETURN) {
      this.carriageReturn();
    } else if (code === CONTROL_LINE_FEED) {
      this.lineFeed();
    } else if (code === CONTROL_BACKSPACE) {
      this.backspace();
    } else if (code === CONTROL_BELL) {
      this.bells = this.bells + 1;
    }
  }


  private storeAndAdvance(code: number): void {
    const column: number = this.windowLeft + this.ch;

    if ((column < TEXT_COLUMNS) && (this.cv < TEXT_ROWS)) {
      this.cells[(this.cv * TEXT_COLUMNS) + column] = code;
    }

    this.ch = this.ch + 1;

    if (this.ch >= this.windowWidth) {
      this.carriageReturn();
    }
  }


  private carriageReturn(): void {
    this.ch = 0;
    this.lineFeed();
  }


  private lineFeed(): void {
    this.cv = this.cv + 1;

    if (this.cv >= this.windowBottom) {
      this.cv = this.cv - 1;
      this.scroll();
    }
  }


  private backspace(): void {
    this.ch = this.ch - 1;

    if (this.ch < 0) {
      this.ch = this.windowWidth - 1;

      if (this.windowTop < this.cv) {
        this.cv = this.cv - 1;
      }
    }
  }


  private scroll(): void {
    for (let row: number = this.windowTop; row < (this.windowBottom - 1); row++) {
      for (let offset: number = 0; offset < this.windowWidth; offset++) {
        const column: number = this.windowLeft + offset;

        if (column < TEXT_COLUMNS) {
          this.cells[(row * TEXT_COLUMNS) + column] = this.cells[((row + 1) * TEXT_COLUMNS) + column];
        }
      }
    }

    this.clearLine(this.windowBottom - 1, 0);
  }


  private clearRows(fromRow: number, fromColumn: number): void {
    this.clearLine(fromRow, fromColumn);

    for (let row: number = fromRow + 1; row < this.windowBottom; row++) {
      this.clearLine(row, 0);
    }

    this.dirty = true;
  }


  private clearLine(row: number, fromOffset: number): void {
    for (let offset: number = fromOffset; offset < this.windowWidth; offset++) {
      const column: number = this.windowLeft + offset;

      if ((column < TEXT_COLUMNS) && (row >= 0) && (row < TEXT_ROWS)) {
        this.cells[(row * TEXT_COLUMNS) + column] = BLANK;
      }
    }
  }

}
