# Akalabeth source notes (Phase 0)

Reference for the port in [`docs/plans/2026-10-akalabeth-port.md`](../plans/2026-10-akalabeth-port.md).
The original files are **linked, not vendored**. The game draws everything as vector lines and text, so it uses no
original image or text file. Everything below refers to
[`videogamepreservation/akalabeth`](https://github.com/videogamepreservation/akalabeth) pinned at commit
`4347170ba0dfcb3e1934886e8763c9a45e9a57a9`:

- `AKLABETH.TXT`: 676 lines, 36,141 bytes, SHA-256 `89d07ef8fda0887a80e138da26ff31580f46a04a0aece41e8e1e40c020607d25`
  ([raw](https://raw.githubusercontent.com/videogamepreservation/akalabeth/4347170ba0dfcb3e1934886e8763c9a45e9a57a9/AKLABETH.TXT)).
  Applesoft `LIST` output.
- `README.1ST`, `RPG.TXT`, `udic.txt`, and 21 screenshots (560×385 GIFs) in the same repository.

The oracle (phase 4) will fetch the listing with a script that checks the SHA-256 and writes to a gitignored folder.

## Provenance and cross-check

| Source | Status |
|---|---|
| `videogamepreservation/akalabeth` `AKLABETH.TXT` | Primary. Its `README.1ST` says "I believe the listing that I have included here is original" and that the Magic Amulet is the most commonly altered part of the many variants in circulation |
| `FoxCunning/akalabeth128` `akalabeth.bas` (CC0-1.0) | Second copy of the same program, ported to C128 BASIC 7.0. Line numbers and logic match; spot-checked lines 520, 1175, 1656–1657, 1663, 1666, 4040, 4046 |
| nanochess GW-BASIC port | Not reachable from this environment (egress blocked) |

**Transcription damage found in the primary copy.** Line 1663 reads `DAM  ( RND (1) * DAM + C(1) / 5)`; the
C128 copy reads `DAM=(RND(1)*DAM + C(1) / 5)`. The `=` was lost, and there is **no `INT`**, so player damage is
a non-integer. A complete line-by-line diff of the two copies is still to do (a naive text diff is too noisy
because the C128 copy is reformatted); it is a Phase 3/4 task, since the oracle interpreter needs a clean
listing.

## Applesoft quirks that decide behaviour

| Quirk | Where | Effect |
|---|---|---|
| Only the first two characters of a name are significant | everywhere | `IN`=`INO`=`INOUT` (depth), `DI`=`DIS`, `LEF`=`LEFT`=`LEVEL`, `RIG`=`RIGH`=`RIGHT`, `PE%`=`PER%`, `TER%`=`TE%`, `DN%`=`DNG%`, `BA`=`BASE`, `CE`=`CENT`, `TA`=`TASK` |
| `DNG(Y,X)` has no `%` | line 520 | Writes an auto-dimensioned **float** array `DN()`, not `DNG%`. Only the `DNG%(X,Y)=1` half of the grid walls reaches the dungeon. The C128 copy has the same line |
| Fractional `HPLOT` coordinates | monster art, lines 300–400 | The ROM truncates them (`C - 5/DI + .5`). Out-of-range values raise an error |
| `ONERR GOTO 4` | line 0 | Any runtime error restarts the program from line 4 (asks the lucky number again) |
| `RND(negative)` reseeds | lines 8, 500, 60010 | World uses `-ABS(LN)`. Each dungeon uses `-ABS(LN) - TX*10 - TY*1000 + INOUT*31.4`. Needs the ROM's exact 5-byte float RND |
| `DIM A(10)` has 11 slots | line 20 | 0..10 inclusive. Index 0 is used (`PER%(0,*)`, `XX%(0)`) |
| Mixed-mode `HGR` | line 100, 200 | 160 graphics rows (hence `159`, `158`), bottom 4 rows are text |

## Apple II calls (verified in phase 2)

Checked against the reconstructed ROM source in
[`cmosher01/Apple-II-Source`](https://github.com/cmosher01/Apple-II-Source) (`src/system/applesoft/applesoft.m4`,
`src/system/monitor/common/display1.m4`, `display2.m4`), GPL-3.0. The port reimplements the behaviour; it copies no
ROM code.

| Call | Used for | Behaviour |
|---|---|---|
| `CALL -868` | after every `PRINT` of a name/status | `CLREOL` ($FC9C): blanks from `CH` to the right edge of the window |
| `CALL 62450` | lines 7001, 60082 | `HCLR` ($F3F2): fills the hi-res page with 0 |
| `PEEK(-16384)` / `POKE -16368,0` | command loop, line 6050 | keyboard data / strobe clear (`$C000` / `$C010`) |
| `POKE 32–35` | lines 69, 1091, 1096, 60080 | `WNDLFT`, `WNDWDTH`, `WNDTOP`, `WNDBTM`; the Monitor does not validate them |
| `HGR` | lines 100, 200 | page 1, mixed mode, then falls into `HCLR`; it does **not** touch the text window |
| `TEXT` | lines 10, 1700, 7000, 7900, 60000, 60080 | `SETTXT`: text mode, full-screen window, cursor to row 24 |
| `HPLOT X,Y` | everywhere | X through `GETADR` (so -0.5 is 0, -1 is 65535) and below 280; Y through `GETBYT` (negative, even -0.5, is an error) and below 192; both truncate. Any failure is `?ILLEGAL QUANTITY`, which `ONERR GOTO 4` turns into a restart |
| `HPLOT TO` | everywhere | `HGLIN`: a four-connected line of \|dx\| + \|dy\| + 1 dots, stepping X while the error term is ≥ 0, else Y |
| `HCOLOR=3` | lines 68, 200 | pattern `$7F`; plotting copies bit 7 too, so every byte a white line touches has its palette bit cleared |
| `HTAB n` | status readout | `CH = n-1`, emitting a carriage return per 40 over; not limited to the window width |
| `,` in `PRINT` | line 60060 | next multiple of 16 if `CH < 24`, else a new line (the ROM's documented bug) |
| `TAB(n)` | line 60080 | prints `n-1-CH` spaces, none if already past |
| `INVERSE` / `NORMAL` | monster names, `CHEST!` | `INVFLG` `$3F` / `$FF`: inverse characters are stored as `$00-$3F` |
| `HIMEM: 49151`, `PR# 0`, `IN# 0`, `FRE(0)` | lines 4–5, 1002 | housekeeping; not emulated |

Key codes in the command loop: 141 Return = forward / North, 149 right arrow = turn right / East,
136 left arrow = turn left / West, 175 `/` = turn around / South, 216 `X` = enter / climb / stairs,
193 `A` or 155 Esc = attack, 211 `S` = stats, 208 `P` = pause toggle, 160 space = pass.

## Numbers (verified in phase 3)

- Applesoft's floating point is Microsoft's 6502 BASIC math package, which Microsoft released under MIT
  ([microsoft/BASIC-M6502](https://github.com/microsoft/BASIC-M6502)). `runtime/applesoft/math-package.ts` ports it
  register by register: the carry flag, the rounding byte (`FACOV`) and the stray bits of the sign byte all reach
  results.
- The Apple-specific differences found are that `FOUT` omits Microsoft's leading space for positive numbers, and
  that the ROM's `RND` constants are four bytes, so each borrows the next byte (the second borrows the `JSR` opcode
  after it). Microsoft's source has the same layout. The borrowed fifth byte of the adder shifts out below `FACOV`,
  which is why the ROM's comment says the addition "does nothing".
- `RND(-1)` gives `2.99196472E-08`, and the sequence is fully determined by the argument, so the same lucky number
  gives the same world as on a real Apple II.
- Expression semantics the fixtures exercise: `FRMEVL` pushes the left operand *rounded*, while the right operand
  keeps its rounding byte, so `C(2) - RND(1)*25` subtracts a product that still carries its extension.
- Fixtures were recorded by running the real ROM in py65 (`apps/Akalabeth/tools/oracle`); the ROM itself is
  built locally from the reconstructed source and never committed.

## Game rules as listed (to confirm with the oracle)

- **Stats** `C(0..5)` = hit points, strength, dexterity, stamina, wisdom, gold, each `INT(SQR(RND(1))*21+4)`.
- **Items** `PW(0..5)` = food, rapier, axe, shield, bow and arrows, magic amulet. Prices 1 per 10 food, 8, 5, 6, 3, 15.
- **Monsters** `M$(1..10)`: skeleton, thief, giant rat, orc, viper, carrion crawler, gremlin, mimic, daemon, balrog.
- **Player hit test** `C(2) - RND(1)*25 < MN + INOUT` counts as a miss (line 1662).
- **Monster hit test** misses when `RND(1)*20 - SGN(PW(3)) - C(3) + MM + IN < 0` (line 4510).
- **Monster hit points** at spawn: `X + 3 + INOUT`, then reset to `X*2 + IN*2*LP` for spawned ones (lines 2005, 2055).
- **Dungeon** 10×10 (`DNG%(0..10,0..10)`); cell value = tile + 10 × monster number. Tiles: 1 wall, 2 hidden trap door, 3 door, 4 secret door, 5 chest, 7 ladder down, 8 ladder up, 9 ladder both ways.
- **Quest** `TASK = INT(C(4)/3)` on the first visit, then 1 more per completed quest; knighthood at 10, then difficulty `LP+1` is offered.
- **No save** (`README.1ST`, `RPG.TXT`).

## Candidate quirks (verify with the oracle before porting as bugs or features)

1. Mage checks at lines 1656–1657 look unreachable, since mages cannot buy rapiers or bows (lines 60227–60228).
2. `LK` accumulates `INT(MN*IN/2)` per kill and is only paid out as hit points on leaving the dungeon (line 1586).
3. Line 387 jumps to 3087 (second half of the Mimic art). The Mimic holds still while within distance 3 (line 4025).
4. Line 1090 charges food as `1 - SGN(INOUT)*.9`, so dungeon turns cost 0.1 food and overworld turns cost 1.
5. Line 1160 trap damage uses `INT(RND(1)*INOUT+3)` and then regenerates the next level through `GOSUB 500`.

## Licence

- The original repo has no licence file, and `README.1ST` gives no terms. The author distributed the source,
  which is not the same as licensing it.
- The C128 port is CC0, but it is derived work, so that does not clear the original.
- Not verified: who holds rights to the name "Akalabeth", the GIFs and `RPG.TXT`.
- **Decision (owner, 2026-10-01):** keep the name "Akalabeth" and publish. Ship only assets the game actually uses
  (none from the original) and link to the original repository for everything else. If a rights holder asks, the
  app comes down promptly. The risk is accepted knowingly; it is not cleared. The wording is in
  [`apps/Akalabeth/NOTICE`](../../apps/Akalabeth/NOTICE).
- An earlier commit on the phase-0 branch vendored the original files; they were removed again in phase 1. Squash-merge
  so the originals never reach `main`.
- This differs from `getzinj/wizardry-angular`, which also vendors no original data (the player supplies their own
  disk). Stonequest itself renamed.
- Fonts: the Apple II character ROM is Apple-copyrighted and is not part of the original project; use a freely
  licensed Apple II-style font.
