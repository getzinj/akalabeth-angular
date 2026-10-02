import { AppleMachine } from '../runtime/apple-machine';
import { KEY_DOWN_ARROW, KEY_UP_ARROW } from '../runtime/keyboard';
import { Game } from './game';
import { pressKey, pressText, settle } from './testing/press-keys';

// The original has no up or down arrow: Return walks forward or north and / turns round or walks south.

function screenText(machine: AppleMachine): string {
  return Array.from({ length: 24 }, (_: unknown, row: number): string => machine.text.line(row)).join('\n');
}


async function startGame(): Promise<AppleMachine> {
  const machine: AppleMachine = new AppleMachine();

  new Game(machine).run().catch((thrown: unknown): void => {
    throw thrown;
  });
  await settle();

  return machine;
}


async function attributeRollAfter(stray: number | null): Promise<string> {
  const machine: AppleMachine = await startGame();

  if (stray != null) {
    await pressKey(machine, stray);
  }

  await pressText(machine, '3\r1\r');

  return screenText(machine);
}


describe('the up and down arrows', (): void => {
  describe('on the overworld', (): void => {
    let machine: AppleMachine;

    beforeEach(async (): Promise<void> => {
      machine = await startGame();
      await pressText(machine, '3\r1\rYFFQ');
    });

    it('the up arrow walks north', async (): Promise<void> => {
      await pressKey(machine, KEY_UP_ARROW);

      expect(screenText(machine)).toContain('NORTH');
    });

    it('the down arrow walks south', async (): Promise<void> => {
      await pressKey(machine, KEY_DOWN_ARROW);

      expect(screenText(machine)).toContain('SOUTH');
    });
  });

  describe('at a prompt that reads a line', (): void => {
    it('the up arrow typed before a lucky number leaves the attribute roll as it was', async (): Promise<void> => {
      expect(await attributeRollAfter(KEY_UP_ARROW)).toBe(await attributeRollAfter(null));
    });

    it('the down arrow typed before a lucky number leaves the attribute roll as it was', async (): Promise<void> => {
      expect(await attributeRollAfter(KEY_DOWN_ARROW)).toBe(await attributeRollAfter(null));
    });
  });
});
