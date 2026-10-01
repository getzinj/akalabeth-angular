# Akalabeth port

> **Live plan.** Status per phase is tracked in [`docs/PLAN.md` §AE](../PLAN.md); flip the box there when a
> PR lands. This file is the rationale and the per-phase checklist. Source findings are in
> [`docs/akalabeth/SOURCE-NOTES.md`](../akalabeth/SOURCE-NOTES.md).

## Context

Port Richard Garriott's 1979 *Akalabeth* (one 676-line Applesoft listing) to Angular as a new Nx app,
`apps/Akalabeth`, in this workspace, to be extracted into its own repo later. Moria followed the same path
(`apps/Moria` from `c768313`, extracted in `66981d6`); its plan is in `getzinj/moria-angular`,
`docs/port-plan.md`.

Decisions:

- **Location.** New Nx app now, own repo later. Keep it self-contained.
- **Fidelity.** Pixel-faithful 280×192 Apple II HGR (mixed mode) and 40×24 text, with simulated CRT
  rastering. The image scales to the available space.
- **Logic.** Idiomatic TypeScript hand-port, verified against a dev-only Applesoft interpreter used as a
  test oracle.

## Lessons from `getzinj/wizardry-angular`

A standalone, non-Nx Angular 22 repo (Vitest, zoneless, GitHub Pages at `wizardry.stonequest.org`).

- **Layers to copy:** `runtime/` (game-agnostic Apple II emulation), `port/` (original procedures, each citing its
  origin by file and line), `ui/` (thin Angular shell). No `data/` layer: Akalabeth has no disk format.
- **Code to copy and adapt** (same author): `runtime/hires-screen.ts` (real 8 KB HGR memory, `hiresRowOffset`,
  `toAscii()` for specs), `apple-hires.constants.ts`, `apple-palette.ts` (NTSC artifact colours, four monitor
  palettes), `text-screen.ts`, `keyboard.ts`, `ui/apple-screen.component.ts`, `builtin-font.ts`.
- **New work here:** the Applesoft ROM `HPLOT` routine (Wizardry ports its own 6502 `DRAWLINE`), the text window
  (`POKE 32–35`), `INVERSE`, `HTAB`/`VTAB`, the CRT presenter, the oracle, pixel golden specs and Playwright. Wizardry
  has integer-only scaling and none of those.
- **Same as Wizardry:** one async game loop suspended on key input, `no-floating-promises`, synthetic fixtures so CI
  needs no original data, screens asserted as ASCII.
- **Deploy** as a static site on GitHub Pages with a CNAME after extraction, not Vercel.
- **Legal:** like Wizardry, Akalabeth vendors no original data; it links to the original repo pinned at a commit. Unlike Wizardry, it uses the original name and publishes (decision in `SOURCE-NOTES.md` §Licence).

## Architecture (`apps/Akalabeth/src/app/`; no Firebase, auth or `api/`)

- `runtime/`: `hgr-framebuffer`, `hgr-line-rasterizer` (ROM HPLOT algorithm, clipping, truncation),
  `text-screen` (40×24, window, cursor, inverse), `keyboard-latch`, `charset`, and `apple-rnd` (reseed on negative
  argument, 5-byte float rounding).
- `port/`: stateless rule services in the repo's style, each citing its BASIC line range. World and dungeon
  generation, perspective tables, character creation, shop, movement, combat, monster AI, Lord British quests,
  death and win.
- `renderers/`: dungeon wireframe (lines 200–490), monster vector art (300–400, 3087), overworld (100–190).
- `ui/`: canvas component and CRT presenter.
- One async game loop awaiting keys, behind an `IApple2Screen` seam like Stonequest's `IGamePresenter`.
- `apps/Akalabeth/oracle/`: dev-only interpreter, excluded from the production build. It drives the same
  `apple2/` layer so framebuffers compare directly.
- ESLint `no-restricted-imports` forbidding `apps/Stonequest` and `@getzinj/{dtos,view-models,...}`; tag `layer:app`.

## Phases (one PR each)

| Phase | Description | Status |
|---|---|---|
| 0 | Source cross-check, `SOURCE-NOTES.md`, this plan, PLAN.md row; licence decision; originals linked, not vendored (changed in phase 1) | ✅ Done; the line-by-line diff of the two listing copies moves to phase 3 |
| 1 | Scaffold `apps/Akalabeth`, copied from Moria's `c768313` scaffold (the `nx-generate` skill was not available): 500 kB budget, e2e port 4202, `nx.json` ESLint include, extraction-guard ESLint rule, CI report path widened to `apps/*/e2e`, placeholder 280×192 integer-scaled canvas. No `vercel.json` change | ✅ Lint, typecheck, 7 unit tests, production build (109 kB initial) and the e2e smoke spec pass; the import guard was shown to fail on a deliberate bad import |
| 2 | Apple II hardware layer: adapt Wizardry's `hires-screen`, palette, text screen and keyboard; add ROM `HPLOT`, text window and `INVERSE`; golden-bitmap specs | ✅ `runtime/`: `HiresScreen` (8 KB page, `HPOSN`/`HPLOT0`/`HGLIN`/`HCLR`/`HCOLOR=` from the reconstructed ROM source, `HFNS` range checks raising `IllegalQuantityError`), `TextScreen` (Monitor window, `COUT`/`CLREOL`/`HOME`/scroll, Applesoft `HTAB`/`VTAB`/`TAB(`/comma/`INVERSE`), `Keyboard` (`$C000`/`$C010` latch, `GET`), `AppleMachine` (`PEEK`/`POKE`/`CALL` map, `HGR`/`TEXT`, mixed-mode render), palette and stand-in font copied from Wizardry. 101 unit tests with ASCII goldens, e2e pixel check, 135 kB initial. `INPUT` line editing moves to phase 5 |
| 3 | Numeric fidelity: Applesoft's float package and `RND` | ✅ `runtime/applesoft/math-package.ts` ports Microsoft's MIT 6502 BASIC math package register by register (FIN, FOUT, ROUND, FADD/FSUB/FMULT/FDIV, `^`, INT, SQR, LOG, EXP, ATN, ABS, SGN, unary minus, RND). 4,597 fixture cases recorded from the real ROM (built from cmosher01/Apple-II-Source, MD5-checked, run in py65 by `apps/Akalabeth/tools/oracle`, never committed) all match; a mutation check confirmed the fixtures catch errors. The listing line diff moves to phase 4 |
| 4 | Oracle: the original listing on the real ROMs, recorded as fixtures | ✅ `tools/oracle`: an Apple II+ in py65 with Applesoft and the autostart Monitor (both built from cmosher01/Apple-II-Source and MD5-checked, never committed), the listing fetched at a pinned commit, repaired (line 1663) and typed in at `$4001`. `port/fixtures/`: perspective tables, 36 worlds, 90 dungeons (three worlds × three squares × levels 1–10, generated by the program's own `GOSUB 500`), six session traces recorded key by key (creation and shop, overworld with town and castle, the knighthood ending, three dungeon runs with combat and two deaths). The listing diff against the C128 copy found no other damage. Regeneration is deterministic. `fixture-reader.ts` replays traces. Not yet covered: amulet effects, traps, kills, ladder up |
| 5a | Game rules, first half: Applesoft values, generators, creation and shop, checked against the oracle | ✅ `runtime/applesoft/basic-number.ts` (a real as the FAC holds it, FRMEVL operator semantics, `AYINT`/`MKINT`/`FCOMP`, `VAL`, `PRINT`) over `MathPackage`; 1,234 more ROM-recorded cases (`integer`, `compare`). `port/`: `perspective-tables`, `world-generator`, `dungeon-generator`, `character-creation`, `shop`, `game-state`. All 7 tables, 36 worlds (terrain, start, rolled stats) and 90 dungeons (squares, monsters, hit points, count, stale slots) match the recorded fixtures exactly; so does the creation and shop trace key by key. `AppleMachine.readLine`/`input` ports the Monitor's `GETLN` and Applesoft's `INPUT`, checked against 35 recorded lines. The oracle's keyboard-poll counting was fixed (see SOURCE-NOTES) and the sessions regenerated |
| 5b | Game rules, second half: command loop, movement, combat, monsters, Lord British, death, with more oracle scenarios | ✅ `port/`: `game` (the command loop, overworld and dungeon movement, ladders, traps, chests, food, death and restart, `ONERR` restarts), `combat` (weapons, the amulet's four gifts), `monster-turns` (approach, flee, steal, attack), `lord-british` (quests to knighthood), `dungeon-view` (the corridor scan, with the monster names and CHEST! it prints; the line drawing goes through an `IPainter` seam that phase 6 fills in). Thirteen recorded sessions replay key by key against the port with their text, inverse video and display mode compared after every key (3,400 checks). Seven new oracle scenarios cover the amulet as fighter and mage, traps and chests, climbing, fleeing monsters, thieves and gremlins, starvation, and every Lord British branch; they steer the original through its own memory (BFS over `DN%`) and poke `C()`, `PW()` and `TASK` where a debugger would |
| 6 | Renderers, pixel-diffed against the oracle (every wall, door, ladder, chest; all 10 monsters at every depth) | ✅ `renderers/hires-painter.ts` draws the overworld view, the corridor (walls, doors, secret doors, ladders, chests) and the ten monsters through the `IPainter` seam. The coordinates are the listing's own HPLOT expressions, generated into `renderers/drawing-programs.ts` by `tools/oracle/generate_drawing_programs.py` and evaluated by `runtime/applesoft/basic-expression.ts` in the ROM's float arithmetic, then cut down by `GETADR`/`GETBYT` (ported and checked on 638 recorded cases) and plotted by `HiresScreen`. All 15 recorded sessions replay with the hi-res page equal to the oracle's after every key (5,800 checks across text, inverse video, mode and pixels); a new gallery scenario pokes each monster into an opened corridor at five distances, so every drawing line has run |
| 7 | Presentation: scaling canvas, CRT presenter (scanlines, bloom, optional NTSC colour and curvature, WebGL2 with Canvas2D fallback), optional authentic draw speed, keyboard and touch input, screen-reader text mirror | ⬜ |
| 8 | Playwright pixel e2e (pattern: `apps/Stonequest/e2e/wizardry-maze-rendering`), budget, a11y, `npm run find-cycles` | ⬜ |
| 9 | Deploy: static build to GitHub Pages as in Wizardry (workflow plus CNAME); no Vercel project | ⬜ |
| 10 | Extract to its own repo | ⬜ |

Out of scope unless asked: save/load, new classes or monsters, balance changes (the original has no save).

## Phase 4 decision

The user chose real-ROM traces over a hand-written interpreter. Fixtures are recorded offline and committed as data;
nothing in CI needs the ROMs.

## Verification

- Per phase: `npm exec nx run Akalabeth:lint`, `:test`, `:build:production`, plus `nx affected` for shared code.
- Fidelity gate (phases 5–6): zero pixel or text differences against the oracle over a fixed corpus of seeds
  and key scripts.
- Phase 7 onward: run the app and screenshot title, overworld, dungeon, combat, shop and Lord British screens at
  several viewport sizes.
- Phase 8: Playwright green in CI; initial bundle under 500 kB.

## Open items

1. **Licence and name.** Decided: keep the name, publish, link to the original repo instead of vendoring, comply with any takedown.
   Risk accepted, not cleared. See `SOURCE-NOTES.md` §Licence.
2. **"Simulating rastering"** is read as CRT scanline and phosphor simulation plus an optional authentic draw
   speed. Confirm.
3. **Apple ROM call semantics** in `SOURCE-NOTES.md` are from memory and are verified in phase 2.
4. **Reference repos.** `wizardry-angular` has been read (above). `moria-angular`'s `docs/port-plan.md` has not.
