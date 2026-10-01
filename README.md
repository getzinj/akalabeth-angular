# Akalabeth

A port of *Akalabeth: World of Doom* (Richard Garriott, 1979) to the browser,
drawn on an emulated Apple II screen: 280x192 hi-res graphics with the text
window, scaled to the space available.

The game's rules are hand-ported from the original Applesoft BASIC listing, which
is linked, not copied; see the [source notes](../../docs/akalabeth/SOURCE-NOTES.md).
The plan and progress are in
[`docs/plans/2026-10-akalabeth-port.md`](../../docs/plans/2026-10-akalabeth-port.md).

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
