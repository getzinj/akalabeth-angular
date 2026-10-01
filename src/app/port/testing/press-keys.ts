import type { AppleMachine } from '../../runtime/apple-machine';

// Drives the game the way the oracle's script did: one key at a time, letting the game run until it
// is waiting for the next.

/** Lets the game run until it is waiting for a key again. */
export async function settle(): Promise<void> {
  await new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve);
  });
}


export async function pressKey(machine: AppleMachine, code: number): Promise<void> {
  machine.keyboard.press(code);
  await settle();
}


export async function pressText(machine: AppleMachine, text: string): Promise<void> {
  for (const character of text.toUpperCase()) {
    await pressKey(machine, character.charCodeAt(0) | 0x80);
  }
}
