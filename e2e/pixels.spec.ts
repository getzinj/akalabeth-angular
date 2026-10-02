import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { inflateHires, replay } from '../src/app/port/fixtures/fixture-reader';
import type { IMachineState, ISessionFixture } from '../src/app/port/fixtures/fixture-reader';
import { AppleMachine } from '../src/app/runtime/apple-machine';
import { NTSC_ARTIFACT_PALETTE } from '../src/app/runtime/apple-palette';

// The browser plays keys the original program was given on the real ROMs, and its canvas is compared
// pixel for pixel with the picture those recorded screens make: the text page and hi-res page the
// oracle held after the same keys, drawn by the same renderer. So the whole path is checked at once,
// from keyboard event through the game and the renderers to the canvas. The CRT effect is off,
// because its glow and scanlines are laid over the canvas and leave its pixels alone.

const SESSIONS: string = join(__dirname, '../src/app/port/fixtures/sessions');
const NO_CRT: string = JSON.stringify({ palette: 'ntsc', crt: false });

const CHECKPOINTS: [ string, number[] ][] = [
  [ 'creation', [ 0, 4, 9, 14, 18 ] ],
  [ 'overworld', [ 20, 30, 45 ] ],
  [ 'dungeon-f-1', [ 20, 40, 80, 130, 200 ] ],
  [ 'dungeon-m-2', [ 25, 45 ] ],
  [ 'dungeon-f-5', [ 60, 100 ] ],
];


function sessionNamed(name: string): ISessionFixture {
  return JSON.parse(readFileSync(join(SESSIONS, `${ name }.json`), 'utf8')) as ISessionFixture;
}


function keyName(code: number): string {
  const ascii: number = code & 0x7F;
  let name: string;

  if (ascii === 0x0D) {
    name = 'Enter';
  } else if (ascii === 0x15) {
    name = 'ArrowRight';
  } else if (ascii === 0x08) {
    name = 'ArrowLeft';
  } else if (ascii === 0x1B) {
    name = 'Escape';
  } else if (ascii === 0x20) {
    name = 'Space';
  } else {
    name = String.fromCharCode(ascii);
  }

  return name;
}


async function expectedHash(state: IMachineState): Promise<string> {
  const machine: AppleMachine = new AppleMachine();
  const pixels: Uint8ClampedArray = new Uint8ClampedArray(280 * 192 * 4);

  if (state.mode.startsWith('GRAPHICS')) {
    machine.hgr();
  } else {
    machine.textMode();
  }
  machine.hires.bytes.set(await inflateHires(state.hires));
  machine.text.load(state.text, state.inverse);
  machine.render(pixels, NTSC_ARTIFACT_PALETTE);

  return createHash('sha256').update(pixels).digest('hex');
}


async function canvasHash(page: Page): Promise<string> {
  return page.locator('akalabeth-apple-screen canvas.picture').evaluate(async (canvas: HTMLCanvasElement): Promise<string> => {
    const data: Uint8ClampedArray = (canvas.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, 280, 192).data;
    const digest: ArrayBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(digest)).map((byte: number): string => byte.toString(16).padStart(2, '0')).join('');
  });
}


for (const [ name, steps ] of CHECKPOINTS) {
  test.describe(`the ${ name } session`, (): void => {
    const session: ISessionFixture = sessionNamed(name);
    const states: IMachineState[] = replay(session);

    for (const step of steps) {
      test(`draws the recorded screen after ${ step } keys`, async ({ page }: { page: Page }): Promise<void> => {
        test.setTimeout(90_000);
        await page.addInitScript((settings: string): void => localStorage.setItem('akalabeth.display', settings), NO_CRT);
        await page.goto('/');
        await expect(page.locator('akalabeth-text-mirror pre')).toContainText('TYPE THY LUCKY NUMBER');

        for (const recorded of session.steps.slice(0, step)) {
          await page.keyboard.press(keyName(recorded.key ?? 0));
        }

        const wanted: string = await expectedHash(states[step]);

        await expect.poll((): Promise<string> => canvasHash(page), { timeout: 30_000 }).toBe(wanted);
      });
    }
  });
}
