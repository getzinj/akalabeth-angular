# Applesoft oracle tools

Offline tools that run the real Applesoft II ROM in the [py65](https://github.com/mnaberez/py65) 6502
emulator and record what it does, so the TypeScript port can be checked against it. Nothing here runs in CI
and nothing it builds is committed: the ROM image is Apple's.

## Setup

```sh
apt-get install m4 xa65   # assembler used by the reconstructed source
pip install py65
./build-rom.sh            # clones cmosher01/Apple-II-Source at a pinned commit, assembles
                          # rom/applesoft.bin and checks its MD5 against the one published there
```

`rom/` is gitignored.

## Fixtures

```sh
python3 generate_numeric_fixtures.py
```

writes `src/app/runtime/applesoft/fixtures/*.json`: FIN, FOUT, ROUND, the five arithmetic operators as
FRMEVL performs them, INT, SQR, ATN, LOG, EXP, ABS, SGN, unary minus, and RND sequences from a range of seeds
(including the dungeon seeds Akalabeth builds from the lucky number). The generator is seeded, so rerunning it
reproduces the same files.
