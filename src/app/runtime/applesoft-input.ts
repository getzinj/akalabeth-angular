// What INPUT makes of a typed line for a string variable (Applesoft's PROCESS_INPUT_ITEM): leading
// spaces are skipped, a quoted value runs to the closing quote, any other ends at a comma or colon,
// and anything left over after the value is reported as ?EXTRA IGNORED.

export interface IInputParse {
  readonly value: string;
  readonly extraIgnored: boolean;
  /** Text follows a closing quote, which sends the player back to the prompt with ?REENTER. */
  readonly reenter: boolean;
}


export function parseInputString(line: string): IInputParse {
  let start: number = 0;
  let end: number;
  let next: number;

  while ((start < line.length) && (line[start] === ' ')) {
    start++;
  }

  if (line[start] === '"') {
    start++;
    end = line.indexOf('"', start);
    next = (end < 0) ? line.length : end + 1;
    end = (end < 0) ? line.length : end;
  } else {
    end = start;
    while ((end < line.length) && (line[end] !== ',') && (line[end] !== ':')) {
      end++;
    }
    next = end;
  }

  while ((next < line.length) && (line[next] === ' ')) {
    next++;
  }

  const atEnd: boolean = next >= line.length;
  const separated: boolean = !atEnd && ((line[next] === ',') || (line[next] === ':'));

  return { value: line.slice(start, end), extraIgnored: separated, reenter: !atEnd && !separated };
}
