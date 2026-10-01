#!/usr/bin/env bash
# Builds the Applesoft II ROM image ($D000-$F7FF) from cmosher01/Apple-II-Source into ./rom/
# for offline fixture generation only. The image is Apple's work: it is gitignored and must
# never be committed. Needs m4 and xa65 (apt-get install xa65).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
work="$here/rom/work"
source_commit="${APPLE2_SOURCE_COMMIT:-8ab5049415370a4282b8c23b0c216817f3ad1e4f}"

mkdir -p "$work"
if [ ! -d "$work/Apple-II-Source" ]; then
  git clone --quiet https://github.com/cmosher01/Apple-II-Source "$work/Apple-II-Source"
fi
git -C "$work/Apple-II-Source" checkout --quiet "$source_commit"

src="$work/Apple-II-Source/src"
m4 -E -I "$src/include" "$src/system/applesoft/applesoft.m4" > "$work/applesoft.s65"
xa -C -XMASM -R -c -bt 0 -l "$here/rom/applesoft.labels" -o "$work/applesoft.o65" "$work/applesoft.s65" 2>/dev/null
ldo65 -bt 53248 -bd 0 -bb 0 -bz 0 -o "$work/applesoft.r65" "$work/applesoft.o65"
reloc65 -xt -o "$here/rom/applesoft.bin" "$work/applesoft.r65" >/dev/null

expected="$(cut -d' ' -f1 "$src/system/applesoft/applesoft.md5")"
actual="$(md5sum "$here/rom/applesoft.bin" | cut -d' ' -f1)"
if [ "$expected" = "$actual" ]; then
  echo "applesoft.bin OK ($actual)"
else
  echo "applesoft.bin checksum $actual does not match $expected" >&2
  exit 1
fi
