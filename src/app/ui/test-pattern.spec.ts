import { AppleMachine } from '../runtime/apple-machine';
import { drawTestPattern } from './test-pattern';


describe('drawTestPattern', (): void => {
  let machine: AppleMachine;

  beforeEach((): void => {
    machine = new AppleMachine();
    drawTestPattern(machine);
  });

  it('shows graphics', (): void => {
    expect(machine.showingGraphics).toBe(true);
  });

  it('writes its title in the text window', (): void => {
    expect(machine.text.line(20).trimEnd()).toBe('AKALABETH - APPLE II SCREEN TEST');
  });

  it('writes the title in inverse', (): void => {
    expect(machine.text.isInverse(0, 20)).toBe(true);
  });

  it('draws the outer frame', (): void => {
    expect(machine.hires.isLit(279, 159)).toBe(true);
  });
});
