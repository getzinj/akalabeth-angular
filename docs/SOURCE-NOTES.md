# Akalabeth source notes (Phase 0)

Reference for the port in [`docs/plans/2026-10-akalabeth-port.md`](../plans/2026-10-akalabeth-port.md).
The original listing is **not vendored** in this repo: it carries no licence (see §Licence). Fetch it
for local work from `https://raw.githubusercontent.com/videogamepreservation/akalabeth/master/AKLABETH.TXT`
(676 lines, 36,141 bytes, Applesoft `LIST` output).

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

## Apple II calls to verify in Phase 2

These are from memory of the Apple II memory map and **must be checked against a reference before use**:

| Call | Used for | Believed meaning |
|---|---|---|
| `CALL -868` | after every `PRINT` of a name/status | clear to end of line (`$FC9C`) |
| `CALL 62450` | lines 7001, 60082 | clear HGR screen to black (`$F3F2`) |
| `PEEK(-16384)` / `POKE -16368,0` | command loop, line 6050 | keyboard data / strobe clear (`$C000` / `$C010`) |
| `POKE 32–35` | lines 69, 1091, 1096, 60080 | text window left/width/top/bottom |
| `POKE 34,20` + `POKE 33,29` | line 69 | window starts at row 20, 29 columns wide. `POKE 33,40` widens it for the `FOOD=`/`H.P.=`/`GOLD=` readout at `HTAB 30` |
| `HIMEM: 49151`, `PR# 0`, `IN# 0`, `FRE(0)` | lines 4–5, 1002 | housekeeping; `FRE(0)` forces garbage collection |

Key codes in the command loop: 141 Return = forward / North, 149 right arrow = turn right / East,
136 left arrow = turn left / West, 175 `/` = turn around / South, 216 `X` = enter / climb / stairs,
193 `A` or 155 Esc = attack, 211 `S` = stats, 208 `P` = pause toggle, 160 space = pass.

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
- **Gate:** keep the app unlisted, vendor neither the listing nor the GIFs, and decide the name before Phase 9 (deploy).
  Stonequest's precedent is renaming.
- Fonts: the Apple II character ROM is Apple-copyrighted; use a freely licensed Apple II-style font.
