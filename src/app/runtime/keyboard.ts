// The Apple II+ keyboard as the game reads it: PEEK(-16384) ($C000) gives the last key with bit 7
// set while it is unread, and POKE -16368,0 ($C010) clears that bit. GET waits for a key and
// clears it too. There is no buffer: a second key before the first is read replaces it.

export const KEY_RETURN: number = 0x8D;
export const KEY_LEFT_ARROW: number = 0x88;
export const KEY_RIGHT_ARROW: number = 0x95;
export const KEY_ESCAPE: number = 0x9B;
export const KEY_SPACE: number = 0xA0;

const STROBE: number = 0x80;


/** The $C000 code a browser key stood for on an Apple II+, which had no lower case, or null. */
export function appleKeyCodeOf(key: string): number | null {
  let code: number | null = null;

  if (key === 'Enter') {
    code = KEY_RETURN;
  } else if ((key === 'ArrowLeft') || (key === 'Backspace')) {
    code = KEY_LEFT_ARROW;
  } else if (key === 'ArrowRight') {
    code = KEY_RIGHT_ARROW;
  } else if (key === 'Escape') {
    code = KEY_ESCAPE;
  } else if (key.length === 1) {
    const ascii: number = key.toUpperCase().charCodeAt(0);

    if ((ascii >= 0x20) && (ascii <= 0x5F)) {
      code = ascii | STROBE;
    }
  }

  return code;
}


export class Keyboard {
  private data: number = 0;

  private waiter: (() => void) | null = null;


  /** A key arriving: latched with the strobe set, replacing whatever was there. */
  public press(code: number): void {
    const waiter: (() => void) | null = this.waiter;

    this.data = code | STROBE;

    if (waiter != null) {
      this.waiter = null;
      waiter();
    }
  }


  /** Translates and latches a browser key. Returns whether it meant anything. */
  public pressKey(key: string): boolean {
    const code: number | null = appleKeyCodeOf(key);

    if (code != null) {
      this.press(code);
    }

    return code != null;
  }


  /** PEEK(-16384). */
  public peekData(): number {
    return this.data;
  }


  /** POKE -16368,0 or PEEK(-16368). */
  public clearStrobe(): void {
    this.data = this.data & 0x7F;
  }


  public get keyWaiting(): boolean {
    return (this.data & STROBE) !== 0;
  }


  /** Whether the program is suspended waiting for a key that has not come. */
  public get isWaiting(): boolean {
    return this.waiter != null;
  }


  /** Resolves once a key is latched, without reading it; the game's PEEK loop at line 1001. */
  public async waitForKey(): Promise<number> {
    if (!this.keyWaiting) {
      await new Promise<void>((resolve: () => void): void => {
        this.waiter = resolve;
      });
    }

    return this.data;
  }


  /** Resolves on the next key pressed, even when an unread one is already latched. */
  public async nextPress(): Promise<number> {
    await new Promise<void>((resolve: () => void): void => {
      this.waiter = resolve;
    });

    return this.data;
  }


  /** GET: waits for a key, clears the strobe and returns the character. */
  public async get(): Promise<string> {
    const code: number = await this.waitForKey();

    this.clearStrobe();

    return String.fromCharCode(code & 0x7F);
  }

}
