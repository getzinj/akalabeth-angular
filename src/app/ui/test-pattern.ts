import type { AppleMachine } from '../runtime/apple-machine';


/** A frame of nested boxes and a text window, standing in until the game itself arrives. */
export function drawTestPattern(machine: AppleMachine): void {
  machine.hgr();
  machine.hires.hcolor(3);

  for (let inset: number = 0; inset < 80; inset = inset + 20) {
    const left: number = Math.round(inset * 1.75);

    machine.hires.hplot(left, inset);
    machine.hires.hplotTo(279 - left, inset);
    machine.hires.hplotTo(279 - left, 159 - inset);
    machine.hires.hplotTo(left, 159 - inset);
    machine.hires.hplotTo(left, inset);
  }

  machine.hires.hplot(0, 0);
  machine.hires.hplotTo(279, 159);
  machine.poke(34, 20);
  machine.text.home();
  machine.text.inverse();
  machine.text.print('AKALABETH');
  machine.text.normal();
  machine.text.print(' - APPLE II SCREEN TEST');
  machine.text.crdo();
  machine.text.print('TYPE SOMETHING: ');
}


/** Echoes keys into the text window, forever. */
export async function echoKeys(machine: AppleMachine): Promise<void> {
  for (;;) {
    const key: string = await machine.keyboard.get();

    if (key === '\r') {
      machine.text.crdo();
    } else {
      machine.text.print(key);
    }
  }
}
