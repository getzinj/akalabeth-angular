import { hiresRowOffset } from './apple-hires.constants';
import { IllegalQuantityError } from './applesoft-errors';
import { HiresScreen } from './hires-screen';


function whiteScreen(): HiresScreen {
  const screen: HiresScreen = new HiresScreen();

  screen.hcolor(3);

  return screen;
}


describe('HiresScreen', (): void => {
  describe('HPLOT X,Y', (): void => {
    it('lights the pixel', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(10, 20);

      expect(screen.isLit(10, 20)).toBe(true);
    });

    it('truncates fractional coordinates', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(139.9, 79.6);

      expect(screen.isLit(139, 79)).toBe(true);
    });

    it('accepts an X between -1 and 0 as 0', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(-0.5, 0);

      expect(screen.isLit(0, 0)).toBe(true);
    });

    it('refuses X = 280', (): void => {
      expect((): void => whiteScreen().hplot(280, 0)).toThrow(IllegalQuantityError);
    });

    it('refuses a negative X', (): void => {
      expect((): void => whiteScreen().hplot(-1, 0)).toThrow(IllegalQuantityError);
    });

    it('refuses Y = 192', (): void => {
      expect((): void => whiteScreen().hplot(0, 192)).toThrow(IllegalQuantityError);
    });

    it('refuses a Y between -1 and 0', (): void => {
      expect((): void => whiteScreen().hplot(0, -0.5)).toThrow(IllegalQuantityError);
    });

    it('clears the palette bit of the byte for HCOLOR=3', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(0, 0);

      expect(screen.bytes[0]).toBe(0x01);
    });

    it('sets the palette bit of the byte for HCOLOR=7', (): void => {
      const screen: HiresScreen = new HiresScreen();

      screen.hcolor(7);
      screen.hplot(0, 0);

      expect(screen.bytes[0]).toBe(0x81);
    });

    it('leaves an even column dark in HCOLOR=1 on an even byte', (): void => {
      const screen: HiresScreen = new HiresScreen();

      screen.hcolor(1);
      screen.hplot(0, 0);

      expect(screen.isLit(0, 0)).toBe(false);
    });

    it('lights an odd column in HCOLOR=1 on an even byte', (): void => {
      const screen: HiresScreen = new HiresScreen();

      screen.hcolor(1);
      screen.hplot(1, 0);

      expect(screen.isLit(1, 0)).toBe(true);
    });

    it('lights the first pixel of an odd byte in HCOLOR=1, as COLOR.SHIFT flips the pattern', (): void => {
      const screen: HiresScreen = new HiresScreen();

      screen.hcolor(1);
      screen.hplot(7, 0);

      expect(screen.isLit(7, 0)).toBe(true);
    });

    it('turns a lit pixel off in HCOLOR=0', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(5, 5);
      screen.hcolor(0);
      screen.hplot(5, 5);

      expect(screen.isLit(5, 5)).toBe(false);
    });
  });

  describe('HPLOT TO X,Y', (): void => {
    it('steps in X or Y, never both, so a shallow line is a staircase', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(0, 0);
      screen.hplotTo(3, 2);

      expect(screen.toAscii(0, 0, 4, 3)).toEqual([
        '##..',
        '.###',
        '...#',
      ]);
    });

    it('draws a 45 degree line as alternating steps', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(0, 0);
      screen.hplotTo(2, 2);

      expect(screen.toAscii(0, 0, 3, 3)).toEqual([
        '##.',
        '.##',
        '..#',
      ]);
    });

    it('draws right to left and bottom to top the same way', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(3, 2);
      screen.hplotTo(0, 0);

      expect(screen.toAscii(0, 0, 4, 3)).toEqual([
        '#...',
        '###.',
        '..##',
      ]);
    });

    it('draws a horizontal line of every pixel', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(5, 1);
      screen.hplotTo(9, 1);

      expect(screen.toAscii(4, 1, 7, 1)).toEqual([ '.#####.' ]);
    });

    it('draws a vertical line of every pixel', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(2, 1);
      screen.hplotTo(2, 4);

      expect(screen.toAscii(2, 0, 1, 6)).toEqual([ '.', '#', '#', '#', '#', '.' ]);
    });

    it('continues from where the last line ended', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(0, 0);
      screen.hplotTo(2, 0);
      screen.hplotTo(2, 2);

      expect(screen.toAscii(0, 0, 3, 3)).toEqual([
        '###',
        '..#',
        '..#',
      ]);
    });

    it('leaves the cursor on the target', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(0, 0);
      screen.hplotTo(17.8, 9.2);

      expect(screen.cursor).toEqual({ x: 17, y: 9 });
    });

    it('refuses a target off the right edge', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(0, 0);

      expect((): void => screen.hplotTo(300, 0)).toThrow(IllegalQuantityError);
    });
  });

  describe('HCOLOR=', (): void => {
    it('refuses 8', (): void => {
      expect((): void => new HiresScreen().hcolor(8)).toThrow(IllegalQuantityError);
    });
  });

  describe('HCLR', (): void => {
    it('blanks the whole screen', (): void => {
      const screen: HiresScreen = whiteScreen();

      screen.hplot(279, 191);
      screen.hclr();

      expect(screen.bytes[hiresRowOffset(191) + 39]).toBe(0);
    });
  });
});
