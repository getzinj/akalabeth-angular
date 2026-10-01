import { AppleMachine } from '../../runtime/apple-machine';
import { ApplesoftRandom } from '../../runtime/applesoft/applesoft-random';
import { CharacterCreation } from '../character-creation';
import { GameState } from '../game-state';
import { pressText, settle } from './press-keys';

export interface IPlayedCreation {
  readonly machine: AppleMachine;
  readonly state: GameState;
  readonly random: ApplesoftRandom;
}


/** Types a lucky number, level 1, accepts the first roll, picks a fighter and leaves the shop. */
export async function playCreation(lucky: string): Promise<IPlayedCreation> {
  const machine: AppleMachine = new AppleMachine();
  const state: GameState = new GameState();
  const random: ApplesoftRandom = new ApplesoftRandom();
  const finished: Promise<void> = new CharacterCreation(machine, state, random).run();

  await settle();
  await pressText(machine, `${lucky}\r1\rYFQ`);
  await finished;

  return { machine, state, random };
}
