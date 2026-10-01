import { ApplesoftRandom } from '../runtime/applesoft/applesoft-random';
import { BasicNumber } from '../runtime/applesoft/basic-number';
import dungeonFixtures from './fixtures/dungeons.json';
import type { IDungeonFixture } from './fixtures/fixture-reader';
import type { IDungeonLevel } from './dungeon-generator';
import { emptyDungeonLevel, generateDungeonLevel } from './dungeon-generator';

// Each expectation was recorded from the original program running on the real ROMs. The program
// kept one set of arrays for a whole session, so levels are generated in recorded order and a
// monster that was not placed keeps the square it had before.

interface IGenerated {
  readonly recorded: IDungeonFixture;
  readonly level: IDungeonLevel;
  readonly name: string;
}


function generateAll(): IGenerated[] {
  const states: Map<string, IDungeonLevel> = new Map<string, IDungeonLevel>();
  const random: ApplesoftRandom = new ApplesoftRandom();

  return (dungeonFixtures as unknown as IDungeonFixture[]).map((recorded: IDungeonFixture): IGenerated => {
    const level: IDungeonLevel = states.get(recorded.lucky) ?? emptyDungeonLevel();

    states.set(recorded.lucky, level);
    generateDungeonLevel(random, {
      lucky: BasicNumber.parse(recorded.lucky),
      squareX: recorded.square[0],
      squareY: recorded.square[1],
      level: recorded.level,
      playerX: 1,
      playerY: 1,
      levelOfPlay: 1,
    }, level);

    return { recorded, level: structuredClone(level), name: `lucky ${recorded.lucky}, square ${recorded.square.join(',')}, level ${recorded.level}` };
  });
}


describe('generateDungeonLevel', (): void => {
  const all: IGenerated[] = generateAll();

  it.each(all)('lays out the squares for $name', ({ recorded, level }: IGenerated): void => {
    expect(level.squares).toEqual(recorded.dng);
  });

  it.each(all)('places the same monsters for $name', ({ recorded, level }: IGenerated): void => {
    expect(level.monsterAt).toEqual(recorded.monsterAt);
  });

  it.each(all)('gives the monsters the same hit points for $name', ({ recorded, level }: IGenerated): void => {
    expect(level.monster).toEqual(recorded.monster);
  });

  it.each(all)('counts the same monsters for $name', ({ recorded, level }: IGenerated): void => {
    expect(level.count).toBe(recorded.count);
  });
});
