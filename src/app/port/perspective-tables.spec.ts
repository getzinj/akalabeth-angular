import type { IPerspectiveTables } from './perspective-tables';
import { buildPerspectiveTables } from './perspective-tables';
import tablesFixture from './fixtures/tables.json';


describe('buildPerspectiveTables', (): void => {
  const built: IPerspectiveTables = buildPerspectiveTables();
  const recorded: IPerspectiveTables = tablesFixture as IPerspectiveTables;

  it.each([ 'XX', 'YY', 'PER', 'LD', 'CD', 'FT', 'LAD' ] as const)('builds %s as the original program does', (name: keyof IPerspectiveTables): void => {
    expect(built[name]).toEqual(recorded[name]);
  });
});
