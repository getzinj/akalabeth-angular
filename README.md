# Akalabeth

A port of *Akalabeth: World of Doom* (Richard Garriott, 1979) to the browser,
drawn on an emulated Apple II screen: 280x192 hi-res graphics with the text
window, scaled to the space available.

The game's rules are hand-ported from the original Applesoft BASIC listing, which
is linked, not copied; see the [source notes](../../docs/akalabeth/SOURCE-NOTES.md).
The plan and progress are in
[`docs/plans/2026-10-akalabeth-port.md`](../../docs/plans/2026-10-akalabeth-port.md).

## Playing

Type a lucky number and a level, accept your attributes with `Y`, choose Fighter or Mage and shop with the
letters shown. Then:

| Key | Does |
|---|---|
| Return | Forward in a dungeon, north on the overworld |
| Left and right arrows | Turn left and right, or west and east |
| `/` | Turn around, or south |
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
npx nx serve Akalabeth        # http://localhost:4202
npx nx test Akalabeth
npx nx lint Akalabeth
npx nx e2e Akalabeth
```

## Licence

GPL-3.0 for the original work of this port only. The game itself belongs to its
author and is not licensed here. See [NOTICE](NOTICE).
