import { IllegalQuantityError } from './applesoft-errors';
import { TextScreen } from './text-screen';


describe('TextScreen', (): void => {
  let screen: TextScreen;

  beforeEach((): void => {
    screen = new TextScreen();
  });

  describe('PRINT', (): void => {
    it('writes at the cursor', (): void => {
      screen.print('HELLO');

      expect(screen.line(0).trimEnd()).toBe('HELLO');
    });

    it('advances the cursor', (): void => {
      screen.print('HELLO');

      expect(screen.cursorColumn).toBe(5);
    });

    it('stores normal characters as $A0-$DF', (): void => {
      screen.print('A');

      expect(screen.screenCode(0, 0)).toBe(0xC1);
    });

    it('stores inverse characters as $00-$3F', (): void => {
      screen.inverse();
      screen.print('A');

      expect(screen.screenCode(0, 0)).toBe(0x01);
    });

    it('goes back to normal after NORMAL', (): void => {
      screen.inverse();
      screen.normal();
      screen.print('A');

      expect(screen.isInverse(0, 0)).toBe(false);
    });

    it('wraps at the window width', (): void => {
      screen.setWindowWidth(3);
      screen.print('ABCD');

      expect(screen.line(1).trimEnd()).toBe('D');
    });

    it('scrolls only the window', (): void => {
      screen.print('KEEP');
      screen.setWindowTop(20);
      screen.vtab(24);
      screen.crdo();

      expect(screen.line(0).trimEnd()).toBe('KEEP');
    });

    it('scrolls the window up a line', (): void => {
      screen.setWindowTop(20);
      screen.vtab(24);
      screen.print('LAST');
      screen.crdo();

      expect(screen.line(22).trimEnd()).toBe('LAST');
    });
  });

  describe('HOME', (): void => {
    it('clears the window', (): void => {
      screen.vtab(22);
      screen.print('GONE');
      screen.setWindowTop(20);
      screen.home();

      expect(screen.line(21).trim()).toBe('');
    });

    it('leaves rows above the window', (): void => {
      screen.print('KEEP');
      screen.setWindowTop(20);
      screen.home();

      expect(screen.line(0).trimEnd()).toBe('KEEP');
    });

    it('puts the cursor at the top of the window', (): void => {
      screen.setWindowTop(20);
      screen.home();

      expect(screen.cursorRow).toBe(20);
    });

    it('clears only within the window width', (): void => {
      screen.vtab(22);
      screen.htab(35);
      screen.print('KEEP');
      screen.setWindowTop(20);
      screen.setWindowWidth(29);
      screen.home();

      expect(screen.line(21).trim()).toBe('KEEP');
    });
  });

  describe('VTAB and HTAB', (): void => {
    it('VTAB 22 puts the cursor on row 21', (): void => {
      screen.vtab(22);

      expect(screen.cursorRow).toBe(21);
    });

    it('VTAB 0 is an error', (): void => {
      expect((): void => screen.vtab(0)).toThrow(IllegalQuantityError);
    });

    it('HTAB 30 puts the cursor in column 29', (): void => {
      screen.htab(30);

      expect(screen.cursorColumn).toBe(29);
    });

    it('HTAB 41 moves to the next line', (): void => {
      screen.htab(41);

      expect(screen.cursorRow).toBe(1);
    });
  });

  describe('comma and TAB(', (): void => {
    it('a comma moves to column 16', (): void => {
      screen.print('ABC');
      screen.comma();

      expect(screen.cursorColumn).toBe(16);
    });

    it('a comma from column 24 starts a new line', (): void => {
      screen.htab(25);
      screen.comma();

      expect(screen.cursorRow).toBe(1);
    });

    it('TAB(24) pads to column 23', (): void => {
      screen.print('HIT POINTS.....');
      screen.tab(24);

      expect(screen.cursorColumn).toBe(23);
    });

    it('TAB( does nothing when already past the column', (): void => {
      screen.htab(30);
      screen.tab(24);

      expect(screen.cursorColumn).toBe(29);
    });
  });

  describe('CLREOL', (): void => {
    it('blanks from the cursor to the end of the window', (): void => {
      screen.print('ABCDEF');
      screen.htab(3);
      screen.clearToEndOfLine();

      expect(screen.line(0).trimEnd()).toBe('AB');
    });

    it('stops at the window width', (): void => {
      screen.htab(35);
      screen.print('KEEP');
      screen.setWindowWidth(29);
      screen.htab(1);
      screen.clearToEndOfLine();

      expect(screen.line(0).trim()).toBe('KEEP');
    });
  });

  describe('resetWindow', (): void => {
    it('moves the cursor to the bottom row', (): void => {
      screen.resetWindow();

      expect(screen.cursorRow).toBe(23);
    });
  });

  describe('characterOf', (): void => {
    it('shows code $01 as A', (): void => {
      expect(TextScreen.characterOf(0x01)).toBe('A');
    });

    it('shows code $A0 as a space', (): void => {
      expect(TextScreen.characterOf(0xA0)).toBe(' ');
    });
  });
});
