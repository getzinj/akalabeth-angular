import inputFixtures from '../port/fixtures/input.json';
import { parseInputString } from './applesoft-input';

// Recorded from the original program's first INPUT on the real ROMs.

interface IInputFixture {
  readonly typed: string;
  readonly string: string;
  readonly rows: readonly string[];
}


// A typed line the editing keys have already resolved, as GETLN hands it over.
const fixtures: IInputFixture[] = (inputFixtures as IInputFixture[]).filter((fixture: IInputFixture): boolean => !/[\x08\x18]/.test(fixture.typed));


describe('parseInputString', (): void => {
  it.each(fixtures)('reads the string for $typed', (fixture: IInputFixture): void => {
    expect(parseInputString(fixture.typed.toUpperCase()).value).toBe(fixture.string);
  });

  it.each(fixtures)('reports leftover text for $typed as the ROM does', (fixture: IInputFixture): void => {
    expect(parseInputString(fixture.typed.toUpperCase()).extraIgnored).toBe(fixture.rows[2] === '?EXTRA IGNORED');
  });
});
