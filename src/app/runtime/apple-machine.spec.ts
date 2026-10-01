import { AppleMachine } from './apple-machine';
import { GREEN_PHOSPHOR_PALETTE } from './apple-palette';
import { UnemulatedAddressError } from './applesoft-errors';


function pixelGreen(target: Uint8ClampedArray, x: number, y: number): number {
  return target[(((y * 280) + x) * 4) + 1];
}


describe('AppleMachine', (): void => {
  let machine: AppleMachine;

  beforeEach((): void => {
    machine = new AppleMachine();
  });

  describe('POKE', (): void => {
    it('34 sets the top of the text window', (): void => {
      machine.poke(34, 20);

      expect(machine.text.windowTopRow).toBe(20);
    });

    it('33 sets the width of the text window', (): void => {
      machine.poke(33, 29);

      expect(machine.text.windowWidthInColumns).toBe(29);
    });

    it('-16368 clears the keyboard strobe', (): void => {
      machine.keyboard.pressKey('a');
      machine.poke(-16368, 0);

      expect(machine.keyboard.keyWaiting).toBe(false);
    });

    it('refuses an address it does not emulate', (): void => {
      expect((): void => machine.poke(768, 0)).toThrow(UnemulatedAddressError);
    });
  });

  describe('PEEK', (): void => {
    it('-16384 reads the keyboard', (): void => {
      machine.keyboard.pressKey('a');

      expect(machine.peek(-16384)).toBe(0xC1);
    });
  });

  describe('CALL', (): void => {
    it('-868 clears to the end of the line', (): void => {
      machine.text.print('ABC');
      machine.text.htab(1);
      machine.call(-868);

      expect(machine.text.line(0).trim()).toBe('');
    });

    it('62450 clears the hi-res screen', (): void => {
      machine.hires.hcolor(3);
      machine.hires.hplot(1, 1);
      machine.call(62450);

      expect(machine.hires.isLit(1, 1)).toBe(false);
    });

    it('refuses an address it does not emulate', (): void => {
      expect((): void => machine.call(-936)).toThrow(UnemulatedAddressError);
    });
  });

  describe('HGR and TEXT', (): void => {
    it('HGR shows graphics', (): void => {
      machine.hgr();

      expect(machine.showingGraphics).toBe(true);
    });

    it('HGR clears the screen', (): void => {
      machine.hires.hcolor(3);
      machine.hires.hplot(1, 1);
      machine.hgr();

      expect(machine.hires.isLit(1, 1)).toBe(false);
    });

    it('HGR leaves the text window alone', (): void => {
      machine.poke(34, 20);
      machine.hgr();

      expect(machine.text.windowTopRow).toBe(20);
    });

    it('TEXT resets the text window', (): void => {
      machine.poke(34, 20);
      machine.textMode();

      expect(machine.text.windowTopRow).toBe(0);
    });
  });

  describe('render', (): void => {
    let target: Uint8ClampedArray;

    beforeEach((): void => {
      target = new Uint8ClampedArray(280 * 192 * 4);
    });

    it('draws a lit hi-res pixel in graphics mode', (): void => {
      machine.hgr();
      machine.hires.hcolor(3);
      machine.hires.hplot(10, 10);
      machine.render(target, GREEN_PHOSPHOR_PALETTE);

      expect(pixelGreen(target, 10, 10)).toBe(0xFF);
    });

    it('shows text, not graphics, below row 160 in mixed mode', (): void => {
      machine.hgr();
      machine.hires.hcolor(3);
      machine.hires.hplot(0, 170);
      machine.render(target, GREEN_PHOSPHOR_PALETTE);

      expect(pixelGreen(target, 0, 170)).toBe(0);
    });

    it('draws inverse text as a lit cell background', (): void => {
      machine.text.inverse();
      machine.text.print(' ');
      machine.render(target, GREEN_PHOSPHOR_PALETTE);

      expect(pixelGreen(target, 0, 0)).toBe(0xFF);
    });

    it('draws a normal space as dark', (): void => {
      machine.text.print(' ');
      machine.render(target, GREEN_PHOSPHOR_PALETTE);

      expect(pixelGreen(target, 0, 0)).toBe(0);
    });
  });
});
