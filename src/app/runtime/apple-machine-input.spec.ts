import inputFixtures from '../port/fixtures/input.json';
import { AppleMachine } from './apple-machine';
import { BasicNumber } from './applesoft/basic-number';

// Recorded from the original program's first INPUT on the real ROMs, typed key by key.

interface IInputFixture {
  readonly typed: string;
  readonly string: string;
  readonly lucky: string;
  readonly rows: readonly string[];
}

const PROMPT: string = 'TYPE THY LUCKY NUMBER.....';
const fixtures: IInputFixture[] = inputFixtures as IInputFixture[];


async function typeLine(typed: string): Promise<{ machine: AppleMachine; value: string }> {
  const machine: AppleMachine = new AppleMachine();

  machine.textMode();
  machine.text.home();
  machine.text.vtab(5);
  const pending: Promise<string> = machine.input(PROMPT);

  for (const character of (typed + '\r').toUpperCase()) {
    machine.keyboard.press(character.charCodeAt(0) | 0x80);
    await new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve);
    });
  }

  return { machine, value: await pending };
}


function packed(value: BasicNumber): string {
  const image: readonly number[] = value.stored().image;
  const bytes: number[] = [ image[0], (image[1] & 0x7F) | (image[5] & 0x80), image[2], image[3], image[4] ];

  return bytes.map((byte: number): string => byte.toString(16).toUpperCase().padStart(2, '0')).join('');
}


describe('AppleMachine.input', (): void => {
  it.each(fixtures)('returns the string for $typed', async (fixture: IInputFixture): Promise<void> => {
    expect((await typeLine(fixture.typed)).value).toBe(fixture.string);
  });

  it.each(fixtures)('echoes $typed on the prompt row', async (fixture: IInputFixture): Promise<void> => {
    expect((await typeLine(fixture.typed)).machine.text.line(4).trimEnd()).toBe(fixture.rows[1]);
  });

  it.each(fixtures)('shows what follows the prompt for $typed', async (fixture: IInputFixture): Promise<void> => {
    expect((await typeLine(fixture.typed)).machine.text.line(5).trimEnd()).toBe(fixture.rows[2]);
  });

  it.each(fixtures)('reads $typed as the same number VAL does', async (fixture: IInputFixture): Promise<void> => {
    // A zero keeps stray mantissa bytes on the ROM, which nothing can see.
    const expected: string = fixture.lucky.startsWith('00') ? '0000000000' : fixture.lucky;

    expect(packed(BasicNumber.val((await typeLine(fixture.typed)).value))).toBe(expected);
  });
});
