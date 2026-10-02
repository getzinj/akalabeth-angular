import { COMMAND_KEYS, MOVEMENT_KEYS } from './touch-keys';
import type { ITouchKey } from './touch-keys';

function codeOf(keys: readonly ITouchKey[], label: string): number | undefined {
  return keys.find((key: ITouchKey): boolean => key.label === label)?.code;
}


describe('touch keys', (): void => {
  it('send Return for forward, as the keyboard does', (): void => {
    expect(codeOf(MOVEMENT_KEYS, '↑')).toBe(0x8D);
  });

  it('send the left arrow for turning left', (): void => {
    expect(codeOf(MOVEMENT_KEYS, '←')).toBe(0x88);
  });

  it('send the right arrow for turning right', (): void => {
    expect(codeOf(MOVEMENT_KEYS, '→')).toBe(0x95);
  });

  it('send a slash for turning around', (): void => {
    expect(codeOf(MOVEMENT_KEYS, '↓')).toBe(0xAF);
  });

  it('send A with the high bit set for attack', (): void => {
    expect(codeOf(COMMAND_KEYS, 'A')).toBe(0xC1);
  });

  it('send a space for passing a turn', (): void => {
    expect(codeOf(COMMAND_KEYS, 'Pass')).toBe(0xA0);
  });

  it('send ESC for the resurrection screen', (): void => {
    expect(codeOf(COMMAND_KEYS, 'Esc')).toBe(0x9B);
  });

  it('give every key a description for screen readers', (): void => {
    expect([ ...MOVEMENT_KEYS, ...COMMAND_KEYS ].every((key: ITouchKey): boolean => key.description.length > 0)).toBe(true);
  });
});
