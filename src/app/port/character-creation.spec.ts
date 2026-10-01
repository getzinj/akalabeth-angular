import { AppleMachine } from '../runtime/apple-machine';
import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { CharacterCreation } from './character-creation';
import creationFixture from './fixtures/sessions/creation.json';
import type { ISessionFixture, ISessionStep } from './fixtures/fixture-reader';
import { replay } from './fixtures/fixture-reader';
import type { IMachineState } from './fixtures/fixture-reader';
import { GameState } from './game-state';
import { pressKey, settle } from './testing/press-keys';

// The original program was given these keys on the real ROMs; after each one its screen was recorded.
// Here the same keys go to the port, and the screen is compared before every key. The recording
// carries on into the overworld, which waits for the renderers; creation ends with the shop.

const session: ISessionFixture = creationFixture as unknown as ISessionFixture;
const SHOP_LEFT_AT_STEP: number = 18;

interface IScreen {
  readonly text: string[];
  readonly inverse: string[];
}


function screenOf(machine: AppleMachine): IScreen {
  const rows: number[] = Array.from({ length: 24 }, (_: unknown, row: number): number => row);

  return {
    text: rows.map((row: number): string => machine.text.line(row)),
    inverse: rows.map((row: number): string => Array.from({ length: 40 }, (_: unknown, column: number): string => (machine.text.isInverse(column, row) ? '1' : '0')).join('')),
  };
}


async function playCreation(): Promise<IScreen[]> {
  const machine: AppleMachine = new AppleMachine();
  const creation: CharacterCreation = new CharacterCreation(machine, new GameState(), new ApplesoftRandom());
  const screens: IScreen[] = [];
  const finished: Promise<void> = creation.run();

  await settle();
  for (const step of session.steps.slice(0, SHOP_LEFT_AT_STEP)) {
    screens.push(screenOf(machine));
    await pressKey(machine, step.key ?? 0);
  }
  await finished;

  return screens;
}


describe('character creation and the shop', (): void => {
  const recorded: IMachineState[] = replay(session).slice(0, SHOP_LEFT_AT_STEP);
  let screens: IScreen[] = [];

  beforeAll(async (): Promise<void> => {
    screens = await playCreation();
  });

  it.each(session.steps.slice(0, SHOP_LEFT_AT_STEP).map((step: ISessionStep, index: number): number => index))('shows the recorded text before key %i', (index: number): void => {
    expect(screens[index].text).toEqual(recorded[index].text);
  });

  it.each(session.steps.slice(0, SHOP_LEFT_AT_STEP).map((step: ISessionStep, index: number): number => index))('shows the recorded inverse video before key %i', (index: number): void => {
    expect(screens[index].inverse).toEqual(recorded[index].inverse);
  });
});
