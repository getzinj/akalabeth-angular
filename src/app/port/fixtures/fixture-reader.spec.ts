import dungeonFixtures from './dungeons.json';
import type { IDungeonFixture, IMachineState, IPerspectiveTables, ISessionFixture, IWorldFixture } from './fixture-reader';
import { inflateHires, replay } from './fixture-reader';
import creation from './sessions/creation.json';
import overworld from './sessions/overworld.json';
import tableFixture from './tables.json';
import worldFixtures from './worlds.json';

// These check the recorded fixtures are whole and shaped as the port will read them; the port's
// own differential specs, from phase 5 on, compare against their contents.

const tables: IPerspectiveTables = tableFixture as IPerspectiveTables;
const worlds: IWorldFixture[] = worldFixtures as unknown as IWorldFixture[];
const dungeons: IDungeonFixture[] = dungeonFixtures as unknown as IDungeonFixture[];


describe('recorded fixtures', (): void => {
  describe('perspective tables', (): void => {
    it('put the nearest frame centre at x 139 (line 51)', (): void => {
      expect(tables.XX[0]).toBe(139);
    });

    it('have eleven distances in PER%', (): void => {
      expect(tables.PER.length).toBe(11);
    });
  });

  describe('worlds', (): void => {
    it('cover 36 lucky numbers', (): void => {
      expect(worlds.length).toBe(36);
    });

    it.each(worlds.map((world: IWorldFixture): [ string, IWorldFixture ] => [ world.lucky, world ]))('lucky %s is ringed by mountains', (_lucky: string, world: IWorldFixture): void => {
      const edge: number[] = world.terrain.flatMap((column: readonly number[], x: number): number[] =>
        column.filter((_cell: number, y: number): boolean => x === 0 || y === 0 || x === 20 || y === 20));

      expect(edge.every((cell: number): boolean => cell === 1)).toBe(true);
    });

    it.each(worlds.map((world: IWorldFixture): [ string, IWorldFixture ] => [ world.lucky, world ]))('lucky %s starts on a town (line 50)', (_lucky: string, world: IWorldFixture): void => {
      expect(world.terrain[world.start[0]][world.start[1]]).toBe(3);
    });
  });

  describe('dungeons', (): void => {
    it.each(dungeons.map((dungeon: IDungeonFixture): [ string, number, IDungeonFixture ] => [ `${ dungeon.lucky } ${ dungeon.square.join(',') }`, dungeon.level, dungeon ]))('%s level %d is walled round', (_where: string, _level: number, dungeon: IDungeonFixture): void => {
      expect(dungeon.dng[0].every((cell: number): boolean => cell % 10 === 1)).toBe(true);
    });
  });

  describe('sessions', (): void => {
    const sessions: ISessionFixture[] = [ creation as ISessionFixture, overworld as ISessionFixture ];

    it.each(sessions.map((session: ISessionFixture): [ string, ISessionFixture ] => [ session.name, session ]))('%s replays to full 24-row screens', (_name: string, session: ISessionFixture): void => {
      const states: IMachineState[] = replay(session);

      expect(states.every((state: IMachineState): boolean => state.text.length === 24)).toBe(true);
    });

    it('decodes a recorded hi-res page to 8 KB', async (): Promise<void> => {
      const last: IMachineState = replay(overworld as ISessionFixture).at(-1) as IMachineState;

      expect((await inflateHires(last.hires)).length).toBe(8192);
    });

    it('shows the first prompt of the game in the creation session', (): void => {
      const first: IMachineState = replay(creation as ISessionFixture)[0];

      expect(first.text.join('\n')).toContain('TYPE THY LUCKY NUMBER');
    });
  });
});
