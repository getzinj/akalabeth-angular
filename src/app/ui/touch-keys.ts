import { KEY_ESCAPE, KEY_LEFT_ARROW, KEY_RETURN, KEY_RIGHT_ARROW, KEY_SPACE } from '../runtime/keyboard';

export interface ITouchKey {
  readonly label: string;
  /** What a screen reader says: the command, not the key. */
  readonly description: string;
  readonly code: number;
}


function letter(character: string): number {
  return character.charCodeAt(0) | 0x80;
}


/** Moving about, as the original's keys did: Return forward or north, the arrows, and / to turn round or go south. */
export const MOVEMENT_KEYS: readonly ITouchKey[] = [
  { label: '↑', description: 'Forward, or north', code: KEY_RETURN },
  { label: '←', description: 'Turn left, or west', code: KEY_LEFT_ARROW },
  { label: '→', description: 'Turn right, or east', code: KEY_RIGHT_ARROW },
  { label: '↓', description: 'Turn around, or south', code: letter('/') },
];

export const COMMAND_KEYS: readonly ITouchKey[] = [
  { label: 'A', description: 'Attack', code: letter('A') },
  { label: 'X', description: 'Use a ladder, shop or castle', code: letter('X') },
  { label: 'S', description: 'Show your stats', code: letter('S') },
  { label: 'Pass', description: 'Pass a turn', code: KEY_SPACE },
  { label: 'Y', description: 'Yes', code: letter('Y') },
  { label: 'N', description: 'No', code: letter('N') },
  { label: 'Return', description: 'Return', code: KEY_RETURN },
  { label: 'Esc', description: 'Escape', code: KEY_ESCAPE },
];
