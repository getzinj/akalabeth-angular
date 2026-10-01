import type { AppleMachine } from '../runtime/apple-machine';
import type { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import type { GameState } from './game-state';
import type { IPainter } from './painter';

export interface IGameContext {
  readonly machine: AppleMachine;
  readonly state: GameState;
  readonly random: ApplesoftRandom;
  readonly painter: IPainter;
}
