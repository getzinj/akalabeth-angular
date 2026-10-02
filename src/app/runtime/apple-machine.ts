import type { IApplePalette, IRgb } from './apple-palette';
import { GLYPH_HEIGHT, HIRES_WIDTH, MIXED_GRAPHICS_ROWS, MIXED_TEXT_TOP, PIXELS_PER_BYTE, TEXT_COLUMNS, TEXT_ROWS } from './apple-hires.constants';
import { parseInputString } from './applesoft-input';
import type { IInputParse } from './applesoft-input';
import { UnemulatedAddressError } from './applesoft-errors';
import { getadr } from './applesoft-numbers';
import { glyphFor } from './builtin-font';
import { HiresScreen } from './hires-screen';
import { Keyboard, KEY_DOWN_ARROW, KEY_LEFT_ARROW, KEY_RETURN, KEY_UP_ARROW } from './keyboard';
import { TextScreen } from './text-screen';


const WNDLFT: number = 0x20;
const WNDWDTH: number = 0x21;
const WNDTOP: number = 0x22;
const WNDBTM: number = 0x23;
const KEYBOARD_DATA: number = 0xC000;
const KEYBOARD_STROBE: number = 0xC010;
const CLREOL: number = 0xFC9C;
const HCLR: number = 0xF3F2;

const KEY_PICK: number = 0x95;
const KEY_ESCAPE: number = 0x9B;
const KEY_CANCEL_LINE: number = 0x98;
const LINE_MARGIN: number = 0xF8;
const MAXIMUM_LINE: number = 239;


export interface IRenderableScreen {
  dirty: boolean;
  render(target: Uint8ClampedArray, palette: IApplePalette): void;
}


/** The parts of an Apple II+ that Akalabeth touches, reached the way the program reaches them. */
export class AppleMachine implements IRenderableScreen {
  public readonly hires: HiresScreen = new HiresScreen();
  public readonly text: TextScreen = new TextScreen();
  public readonly keyboard: Keyboard = new Keyboard();

  private graphicsMode: boolean = false;
  private hiresSwitchesSet: boolean = false;


  public get dirty(): boolean {
    return this.hires.dirty || this.text.dirty;
  }


  public set dirty(value: boolean) {
    this.hires.dirty = value;
    this.text.dirty = value;
  }


  public get showingGraphics(): boolean {
    return this.graphicsMode;
  }


  /** The display switches as the oracle names them: GRAPHICS or TEXT, then +MIXED+HIRES once HGR has run. */
  public get modeSwitches(): string {
    return (this.graphicsMode ? 'GRAPHICS' : 'TEXT') + (this.hiresSwitchesSet ? '+MIXED+HIRES' : '');
  }


  /** HGR: page 1, mixed mode, and clear. It leaves the text window alone. */
  public hgr(): void {
    this.graphicsMode = true;
    this.hiresSwitchesSet = true;
    this.hires.hclr();
  }


  /** TEXT: text mode and a full-screen window. */
  public textMode(): void {
    this.graphicsMode = false;
    this.text.resetWindow();
    this.text.dirty = true;
  }


  public peek(address: number): number {
    const location: number = getadr('PEEK', address);
    let value: number;

    if (location === KEYBOARD_DATA) {
      value = this.keyboard.peekData();
    } else if (location === KEYBOARD_STROBE) {
      this.keyboard.clearStrobe();
      value = 0;
    } else {
      throw new UnemulatedAddressError('PEEK', address);
    }

    return value;
  }


  public poke(address: number, value: number): void {
    const location: number = getadr('POKE', address);

    if (location === WNDLFT) {
      this.text.setWindowLeft(value);
    } else if (location === WNDWDTH) {
      this.text.setWindowWidth(value);
    } else if (location === WNDTOP) {
      this.text.setWindowTop(value);
    } else if (location === WNDBTM) {
      this.text.setWindowBottom(value);
    } else if (location === KEYBOARD_STROBE) {
      this.keyboard.clearStrobe();
    } else {
      throw new UnemulatedAddressError('POKE', address);
    }
  }


  public call(address: number): void {
    const location: number = getadr('CALL', address);

    if (location === CLREOL) {
      this.text.clearToEndOfLine();
    } else if (location === HCLR) {
      this.hires.hclr();
    } else {
      throw new UnemulatedAddressError('CALL', address);
    }
  }


  /** RDKEY: the next key, strobe cleared, bit 7 set. */
  public async readKey(): Promise<number> {
    const code: number = await this.keyboard.waitForKey();

    this.keyboard.clearStrobe();

    return code;
  }


  /** RDCHAR: as RDKEY, except that ESC swallows the key after it (the escape functions are not ported). */
  private async readTypedCharacter(): Promise<number> {
    let code: number = await this.readKey();

    while ((code === KEY_ESCAPE) || (code === KEY_UP_ARROW) || (code === KEY_DOWN_ARROW)) {
      if (code === KEY_ESCAPE) {
        await this.readKey();
      }

      code = await this.readKey();
    }

    return code;
  }


  /**
   * INPUT's line editing, which is the Monitor's GETLN: typed characters are echoed, the left
   * arrow backs up (and past the start abandons the line), Ctrl-X cancels with a backslash and the
   * right arrow copies the character under the cursor. Return clears to the end of the line.
   */
  public async readLine(): Promise<string> {
    const typed: number[] = [];
    let index: number = 0;
    let finished: boolean = false;

    while (!finished) {
      let code: number = await this.readTypedCharacter();

      if (code === KEY_PICK) {
        code = this.text.codeUnderCursor;
      }
      if (code >= 0xE0) {
        code = code & 0xDF;
      }
      typed[index] = code;

      if (code === KEY_RETURN) {
        this.text.clearToEndOfLine();
        this.text.crdo();
        finished = true;
      } else {
        this.text.echo(String.fromCharCode(code & 0x7F));

        if (code === KEY_LEFT_ARROW) {
          if (index === 0) {
            this.text.crdo();
          } else {
            index = index - 1;
          }
        } else if (code === KEY_CANCEL_LINE) {
          this.text.print('\\');
          this.text.crdo();
          index = 0;
        } else {
          if (index >= LINE_MARGIN) {
            this.text.print(String.fromCharCode(0x07));
          }
          index = index + 1;
        }
      }
    }

    return typed.slice(0, Math.min(index, MAXIMUM_LINE)).map((value: number): string => String.fromCharCode(value & 0x7F)).join('');
  }


  /** INPUT "prompt";A$ : the prompt, a line, and Applesoft's reading of it. */
  public async input(prompt: string): Promise<string> {
    let parsed: IInputParse | null = null;

    while (parsed == null) {
      this.text.print(prompt);
      const attempt: IInputParse = parseInputString(await this.readLine());

      if (attempt.reenter) {
        this.text.print('?REENTER');
        this.text.crdo();
      } else {
        parsed = attempt;
      }
    }

    if (parsed.extraIgnored) {
      this.text.print('?EXTRA IGNORED');
      this.text.crdo();
    }

    return parsed.value;
  }


  /** What the monitor shows: hi-res over four text rows, or the whole text page. */
  public render(target: Uint8ClampedArray, palette: IApplePalette): void {
    if (this.graphicsMode) {
      this.hires.render(target, palette, MIXED_GRAPHICS_ROWS);
      this.renderText(target, palette, MIXED_TEXT_TOP);
    } else {
      this.renderText(target, palette, 0);
    }
  }


  private renderText(target: Uint8ClampedArray, palette: IApplePalette, firstRow: number): void {
    for (let row: number = firstRow; row < TEXT_ROWS; row++) {
      for (let column: number = 0; column < TEXT_COLUMNS; column++) {
        const glyph: readonly number[] = glyphFor(this.text.character(column, row));
        const inverse: boolean = this.text.isInverse(column, row);

        for (let glyphRow: number = 0; glyphRow < GLYPH_HEIGHT; glyphRow++) {
          for (let bit: number = 0; bit < PIXELS_PER_BYTE; bit++) {
            const lit: boolean = ((glyph[glyphRow] & (1 << bit)) !== 0) !== inverse;
            const index: number = ((((row * GLYPH_HEIGHT) + glyphRow) * HIRES_WIDTH) + (column * PIXELS_PER_BYTE) + bit) * 4;
            const color: IRgb = lit ? palette.white : palette.background;

            target[index] = color.r;
            target[index + 1] = color.g;
            target[index + 2] = color.b;
            target[index + 3] = 255;
          }
        }
      }
    }
  }

}

