# Akalabeth

A port of *Akalabeth: World of Doom* (Richard Garriott, 1979) to the browser,
drawn on an emulated Apple II screen: 280x192 hi-res graphics with the text
window, scaled to the space available.

The game's rules are hand-ported from the original Applesoft BASIC listing, which
is linked, not copied; see the [source notes](docs/SOURCE-NOTES.md).
The plan and progress are in
[`docs/port-plan.md`](docs/port-plan.md).

## Playing

Type a lucky number and a level, accept your attributes with `Y`, choose Fighter or Mage and shop with the
letters shown. Then:

| Key | Does |
|---|---|
| Return, or up arrow | Forward in a dungeon, north on the overworld |
| Left and right arrows | Turn left and right, or west and east |
| `/`, or down arrow | Turn around, or south |
| `A` (or Esc) | Attack, then the weapon's letter |
| `X` | Enter a town, dungeon or castle; use a ladder |
| `S` | Your stats |
| Space | Pass a turn |
| `P` | Pause after each fight (asks for Return) |

The gear button in the corner chooses the screen colour (Apple II colour, green, amber or white) and turns the
CRT effect (scanlines and phosphor glow) on or off; the choice is remembered. On a phone or tablet a button pad
appears, with a keyboard button for names and numbers. The text on screen is also announced to screen readers.

## Running

```sh
npm ci
npm start           # http://localhost:4202
npm test
npm run lint
npm run e2e         # Playwright: starts the dev server itself
npm run build       # dist/akalabeth/browser
```

Play it at <https://akalabeth.stonequest.org>.

Every pull request and push is linted, tested, built and run through the browser specs by
`.github/workflows/deploy.yml`; pushes to `main` are then deployed to GitHub Pages. The site is built for a domain
root, so Pages needs its source set to "GitHub Actions" and its custom domain set to `akalabeth.stonequest.org` in
the repository settings: a deploy from Actions ignores `public/CNAME`.

## Layout

| Folder | What lives there |
| --- | --- |
| `src/app/runtime/` | The Apple II: hi-res and text screens, keyboard, the Applesoft number package. Knows nothing about the game. |
| `src/app/port/` | The game rules, ported from the listing, with fixtures recorded from the real ROMs. |
| `src/app/renderers/` | The listing's drawing statements, plotted pixel for pixel. |
| `src/app/ui/` | The Angular shell: screen, CRT effect, touch pad, settings, text mirror. |
| `e2e/` | Playwright specs, including pixel checks against the oracle's screens. |
| `tools/oracle/` | Offline Python harness that runs the original on the real ROMs; see its README. |

## Licence

GPL-3.0 for the original work of this port only. The game itself belongs to its
author and is not licensed here. See [NOTICE](NOTICE).
