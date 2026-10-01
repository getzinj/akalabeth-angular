import { AppleMachine } from '../runtime/apple-machine';
import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import dungeonF1 from './fixtures/sessions/dungeon-f-1.json';
import dungeonF5 from './fixtures/sessions/dungeon-f-5.json';
import dungeonM2 from './fixtures/sessions/dungeon-m-2.json';
import knighthood from './fixtures/sessions/knighthood.json';
import overworld from './fixtures/sessions/overworld.json';
import amuletFighter from './fixtures/sessions/amulet-f-10.json';
import amuletMage from './fixtures/sessions/amulet-m-10.json';
import court from './fixtures/sessions/court-3.json';
import creation from './fixtures/sessions/creation.json';
import knighthoodTop from './fixtures/sessions/knighthood-top-3.json';
import fleeing from './fixtures/sessions/fleeing-10.json';
import gallery from './fixtures/sessions/gallery-10.json';
import starvation from './fixtures/sessions/starvation-3.json';
import thieves from './fixtures/sessions/thieves-12.json';
import traps from './fixtures/sessions/traps-chests-10.json';
import type { IMachineState, ISessionFixture, ISessionSetup } from './fixtures/fixture-reader';
import { inflateHires, replay } from './fixtures/fixture-reader';
import { HiresPainter } from '../renderers/hires-painter';
import { Game } from './game';
import { pressKey, settle } from './testing/press-keys';

// The original program was given these keys on the real ROMs; after each one its text screen and
// display mode and hi-res page were recorded. The port gets the same keys and is compared before
// every key and after the last.

interface IScreen {
  readonly text: string[];
  readonly inverse: string[];
  readonly mode: string;
  readonly hires: Uint8Array;
}

const sessions: ISessionFixture[] = [
  creation, overworld, knighthood, dungeonF1, dungeonM2, dungeonF5,
  amuletFighter, amuletMage, traps, fleeing, thieves, starvation, court, knighthoodTop, gallery,
] as unknown as ISessionFixture[];


function firstDifference(left: Uint8Array, right: Uint8Array): number {
  let index: number = 0;

  while ((index < left.length) && (left[index] === right[index])) {
    index = index + 1;
  }

  return ((index === left.length) && (left.length === right.length)) ? -1 : index;
}


function screenOf(machine: AppleMachine): IScreen {
  const rows: number[] = Array.from({ length: 24 }, (_: unknown, row: number): number => row);

  return {
    text: rows.map((row: number): string => machine.text.line(row)),
    inverse: rows.map((row: number): string => Array.from({ length: 40 }, (_: unknown, column: number): string => (machine.text.isInverse(column, row) ? '1' : '0')).join('')),
    mode: machine.modeSwitches,
    hires: machine.hires.bytes.slice(),
  };
}


function setupsOf(session: ISessionFixture): readonly ISessionSetup[] {
  const legacy: ISessionSetup[] = [ { beforeKey: session.steps.length - 3, task: -10 } ];

  return session.setups ?? ((session.name === 'knighthood') ? legacy : []);
}


function applySetup(game: Game, setup: ISessionSetup): void {
  if (setup.task != null) {
    game.state.task = setup.task;
  } else if ((setup.square != null) && (setup.value != null)) {
    game.state.dungeon.squares[setup.square[0]][setup.square[1]] = setup.value;
  } else if ((setup.array != null) && (setup.index != null) && (setup.value != null)) {
    const cells: BasicNumber[] = (setup.array === 'C') ? game.state.attributes : game.state.possessions;

    cells[setup.index] = BasicNumber.of(setup.value).stored();
  }
}


async function play(session: ISessionFixture): Promise<IScreen[]> {
  const machine: AppleMachine = new AppleMachine();
  const game: Game = new Game(machine, new HiresPainter(machine.hires), new ApplesoftRandom());
  const screens: IScreen[] = [];

  void game.run();
  await settle();

  for (let index: number = 0; index < session.steps.length; index++) {
    const key: number | undefined = session.steps[index].key;

    screens.push(screenOf(machine));
    if (key != null) {
      for (const setup of setupsOf(session).filter((candidate: ISessionSetup): boolean => candidate.beforeKey === index)) {
        applySetup(game, setup);
      }
      await pressKey(machine, key);
    }
  }

  return screens;
}


describe.each(sessions)('the $name session', (session: ISessionFixture): void => {
  const recorded: IMachineState[] = replay(session);
  let screens: IScreen[] = [];
  let pages: Uint8Array[] = [];
  const steps: number[] = session.steps.map((_: unknown, index: number): number => index);

  beforeAll(async (): Promise<void> => {
    screens = await play(session);
    pages = await Promise.all(recorded.map((state: IMachineState): Promise<Uint8Array> => inflateHires(state.hires)));
  });

  it.each(steps)('shows the recorded text at step %i', (index: number): void => {
    expect(screens[index].text).toEqual(recorded[index].text);
  });

  it.each(steps)('shows the recorded inverse video at step %i', (index: number): void => {
    expect(screens[index].inverse).toEqual(recorded[index].inverse);
  });

  it.each(steps)('is in the recorded display mode at step %i', (index: number): void => {
    expect(screens[index].mode).toBe(recorded[index].mode);
  });

  it.each(steps)('draws the recorded hi-res page at step %i', (index: number): void => {
    expect(firstDifference(screens[index].hires, pages[index])).toBe(-1);
  });
});
