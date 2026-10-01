// Readers for the fixtures recorded from the original program running on the real ROMs
// (apps/Akalabeth/tools/oracle/generate_game_fixtures.py). Sessions store each step as changes
// against the previous one; replay() rebuilds the full machine state at every key.

export interface IPerspectiveTables {
  readonly XX: readonly number[];
  readonly YY: readonly number[];
  readonly PER: readonly (readonly number[])[];
  readonly LD: readonly (readonly number[])[];
  readonly CD: readonly (readonly number[])[];
  readonly FT: readonly (readonly number[])[];
  readonly LAD: readonly (readonly number[])[];
}


export interface IWorldFixture {
  readonly lucky: string;
  /** TE%(X,Y), indexed [x][y]. */
  readonly terrain: readonly (readonly number[])[];
  readonly start: readonly [ number, number ];
  readonly stats: readonly number[];
  readonly statsPacked: readonly string[];
}


export interface IDungeonFixture {
  readonly lucky: string;
  readonly square: readonly [ number, number ];
  readonly level: number;
  /** DNG%(X,Y), indexed [x][y]. */
  readonly dng: readonly (readonly number[])[];
  readonly monsterAt: readonly (readonly number[])[];
  readonly monster: readonly (readonly number[])[];
  readonly count: number;
  /** The float array line 520 writes to by mistake, as packed hex. */
  readonly floatDng?: readonly (readonly string[])[];
}


export interface ISessionStep {
  readonly key?: number;
  readonly text?: Readonly<Record<string, string>>;
  readonly inverse?: Readonly<Record<string, string>>;
  readonly mode?: string;
  readonly hires?: string;
  readonly errors?: readonly { readonly code: number; readonly line: number }[];
}


export interface ISessionFixture {
  readonly name: string;
  readonly lucky: string;
  readonly setup?: string;
  readonly steps: readonly ISessionStep[];
}


export interface IMachineState {
  readonly key: number | null;
  readonly text: readonly string[];
  readonly inverse: readonly string[];
  readonly mode: string;
  /** Base64 of the zlib-compressed 8 KB hi-res page; decode with inflateHires. */
  readonly hires: string;
  readonly errors: readonly { readonly code: number; readonly line: number }[];
}


/** Full states, one per recorded step: the screen as it stood when the next key was pressed. */
export function replay(session: ISessionFixture): IMachineState[] {
  const text: string[] = new Array<string>(24).fill('');
  const inverse: string[] = new Array<string>(24).fill('');
  let mode: string = '';
  let hires: string = '';

  return session.steps.map((step: ISessionStep): IMachineState => {
    for (const [ row, line ] of Object.entries(step.text ?? {})) {
      text[Number(row)] = line;
    }
    for (const [ row, mask ] of Object.entries(step.inverse ?? {})) {
      inverse[Number(row)] = mask;
    }
    mode = step.mode ?? mode;
    hires = step.hires ?? hires;

    return { key: step.key ?? null, text: [ ...text ], inverse: [ ...inverse ], mode, hires, errors: step.errors ?? [] };
  });
}


export async function inflateHires(encoded: string): Promise<Uint8Array> {
  const compressed: Uint8Array = Uint8Array.from(atob(encoded), (character: string): number => character.charCodeAt(0));
  const stream: ReadableStream<Uint8Array> = new Blob([ compressed ]).stream().pipeThrough(new DecompressionStream('deflate'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}
