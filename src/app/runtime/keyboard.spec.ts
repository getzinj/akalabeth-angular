import { KEY_ESCAPE, KEY_LEFT_ARROW, KEY_RETURN, KEY_RIGHT_ARROW, Keyboard, appleKeyCodeOf } from './keyboard';


describe('appleKeyCodeOf', (): void => {
  it('maps Enter to Return', (): void => {
    expect(appleKeyCodeOf('Enter')).toBe(KEY_RETURN);
  });

  it('maps the left arrow to Ctrl-H', (): void => {
    expect(appleKeyCodeOf('ArrowLeft')).toBe(KEY_LEFT_ARROW);
  });

  it('maps the right arrow to Ctrl-U', (): void => {
    expect(appleKeyCodeOf('ArrowRight')).toBe(KEY_RIGHT_ARROW);
  });

  it('maps Escape to 155', (): void => {
    expect(appleKeyCodeOf('Escape')).toBe(KEY_ESCAPE);
  });

  it('upper-cases letters, as the II+ had no lower case', (): void => {
    expect(appleKeyCodeOf('a')).toBe(0xC1);
  });

  it('maps / to 175', (): void => {
    expect(appleKeyCodeOf('/')).toBe(175);
  });

  it('ignores keys the II+ did not have', (): void => {
    expect(appleKeyCodeOf('ArrowUp')).toBeNull();
  });
});


describe('Keyboard', (): void => {
  let keyboard: Keyboard;

  beforeEach((): void => {
    keyboard = new Keyboard();
  });

  it('latches a key with the strobe set', (): void => {
    keyboard.pressKey('x');

    expect(keyboard.peekData()).toBe(216);
  });

  it('keeps the key but drops the strobe when cleared', (): void => {
    keyboard.pressKey('x');
    keyboard.clearStrobe();

    expect(keyboard.peekData()).toBe(0x58);
  });

  it('replaces an unread key with a newer one', (): void => {
    keyboard.pressKey('a');
    keyboard.pressKey('b');

    expect(keyboard.peekData()).toBe(0xC2);
  });

  it('GET returns the character', async (): Promise<void> => {
    keyboard.pressKey('y');

    expect(await keyboard.get()).toBe('Y');
  });

  it('GET clears the strobe', async (): Promise<void> => {
    keyboard.pressKey('y');
    await keyboard.get();

    expect(keyboard.keyWaiting).toBe(false);
  });

  it('GET waits for a key that has not been pressed yet', async (): Promise<void> => {
    const pending: Promise<string> = keyboard.get();

    keyboard.pressKey('n');

    expect(await pending).toBe('N');
  });
});
