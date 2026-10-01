import { hiresRowOffset } from './apple-hires.constants';


describe('hiresRowOffset', (): void => {
  it('puts row 0 at the start of the page', (): void => {
    expect(hiresRowOffset(0)).toBe(0x0000);
  });

  it('puts row 1 a kilobyte further on', (): void => {
    expect(hiresRowOffset(1)).toBe(0x0400);
  });

  it('puts row 8 one band down', (): void => {
    expect(hiresRowOffset(8)).toBe(0x0080);
  });

  it('puts row 64 in the second third', (): void => {
    expect(hiresRowOffset(64)).toBe(0x0028);
  });

  it('puts row 191 at the last row address', (): void => {
    expect(hiresRowOffset(191)).toBe(0x1FD0);
  });
});
