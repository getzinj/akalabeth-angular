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
| 2 | Apple II hardware layer: adapt Wizardry's `hires-screen`, palette, text screen and keyboard; add ROM `HPLOT`, text window and `INVERSE`; golden-bitmap specs | ⬜ |
| 3 | `AppleRnd` and truncation helpers; golden sequences generated once offline from an independent emulator and committed as fixtures. Clean listing from the line-by-line diff | ⬜ |
| 4 | Oracle interpreter, validated against the phase-3 fixtures | ⬜ |
| 5 | Game rules, with differential specs against the oracle (dungeon grids for many seeds, perspective tables, scripted key sequences compared after every key) | ⬜ |
| 6 | Renderers, pixel-diffed against the oracle (every wall, door, ladder, chest; all 10 monsters at every depth) | ⬜ |
| 7 | Presentation: scaling canvas, CRT presenter (scanlines, bloom, optional NTSC colour and curvature, WebGL2 with Canvas2D fallback), optional authentic draw speed, keyboard and touch input, screen-reader text mirror | ⬜ |
| 8 | Playwright pixel e2e (pattern: `apps/Stonequest/e2e/wizardry-maze-rendering`), budget, a11y, `npm run find-cycles` | ⬜ |
| 9 | Deploy: static build to GitHub Pages as in Wizardry (workflow plus CNAME); no Vercel project | ⬜ |
| 10 | Extract to its own repo | ⬜ |

Out of scope unless asked: save/load, new classes or monsters, balance changes (the original has no save).

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
