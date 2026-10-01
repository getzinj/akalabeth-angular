import { facToNumber } from '../runtime/applesoft/fac-value';
import worldFixtures from './fixtures/worlds.json';
import type { IWorldFixture } from './fixtures/fixture-reader';
import type { IWorld } from './world-generator';
import { generateWorld } from './world-generator';
import type { IPlayedCreation } from './testing/play-creation';
import { playCreation } from './testing/play-creation';

// Each expectation was recorded from the original program running on the real ROMs. The world is
// generated after creation because the random numbers rolled for the attributes come first, and for
// lucky number 0 (RND(0) repeats the last number instead of reseeding) the world depends on them.

const fixtures: IWorldFixture[] = worldFixtures as unknown as IWorldFixture[];
const created: Map<string, { played: IPlayedCreation; world: IWorld }> = new Map();


async function worldFor(lucky: string): Promise<{ played: IPlayedCreation; world: IWorld }> {
  let result: { played: IPlayedCreation; world: IWorld } | undefined = created.get(lucky);

  if (result == null) {
    const played: IPlayedCreation = await playCreation(lucky);

    result = { played, world: generateWorld(played.random, played.state.luckyNumber) };
    created.set(lucky, result);
  }

  return result;
}


describe('rolling a character and generating the world', (): void => {
  it.each(fixtures)('rolls the attributes for lucky number $lucky', async (fixture: IWorldFixture): Promise<void> => {
    const { played } = await worldFor(fixture.lucky);

    expect(played.state.attributes.map((value): number => facToNumber(value.image))).toEqual(fixture.stats);
  });

  it.each(fixtures)('lays out the terrain for lucky number $lucky', async (fixture: IWorldFixture): Promise<void> => {
    expect((await worldFor(fixture.lucky)).world.terrain).toEqual(fixture.terrain);
  });

  it.each(fixtures)('puts the town where lucky number $lucky starts', async (fixture: IWorldFixture): Promise<void> => {
    const { world } = await worldFor(fixture.lucky);

    expect([ world.startX, world.startY ]).toEqual(fixture.start);
  });
});
