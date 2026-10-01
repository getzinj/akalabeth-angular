import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import worldFixtures from './fixtures/worlds.json';
import type { IWorldFixture } from './fixtures/fixture-reader';
import type { IWorld } from './world-generator';
import { generateWorld } from './world-generator';

// Each expectation was recorded from the original program running on the real ROMs.

const worlds: IWorldFixture[] = worldFixtures as unknown as IWorldFixture[];


function generated(lucky: string): IWorld {
  return generateWorld(new ApplesoftRandom(), BasicNumber.parse(lucky));
}


describe('generateWorld', (): void => {
  it.each(worlds)('lays out the terrain for lucky number $lucky', (world: IWorldFixture): void => {
    expect(generated(world.lucky).terrain).toEqual(world.terrain);
  });

  it.each(worlds)('puts the town where lucky number $lucky starts', (world: IWorldFixture): void => {
    const built: IWorld = generated(world.lucky);

    expect([ built.startX, built.startY ]).toEqual(world.start);
  });
});
