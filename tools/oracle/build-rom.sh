#!/usr/bin/env bash
# Builds the Apple II+ ROM images, Applesoft ($D000-$F7FF) and the autostart Monitor ($F800-$FFFF),
# from cmosher01/Apple-II-Source into ./rom/ for offline fixture generation only. The image is Apple's work: it is gitignored and must
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

monitor_objects=()
for part in "$src/system/monitor/apple2plus/monitor.m4" "$src"/system/monitor/common/{lores,disasm,debug,paddles,display1,math,display2,cassette,keyin,cmd,vectors}.m4; do
  name="$(basename "$part" .m4)"
  m4 -E -I "$src/include" -I "$src/system/monitor/common" -DVERSION=2 "$part" > "$work/monitor-$name.s65"
  xa -C -XMASM -XXA23 -R -c -bt 0 -bd 0 -bb 0 -bz 0 -o "$work/monitor-$name.o65" "$work/monitor-$name.s65" 2>/dev/null
  monitor_objects+=("$work/monitor-$name.o65")
done
ldo65 -bt 63488 -bd 0 -bb 0 -bz 0 -o "$work/monitor.r65" "${monitor_objects[@]}"
reloc65 -xt -o "$here/rom/monitor.bin" "$work/monitor.r65" >/dev/null

check() {
  local expected actual
  expected="$(cut -d' ' -f1 "$2")"
  actual="$(md5sum "$1" | cut -d' ' -f1)"
  if [ "$expected" = "$actual" ]; then
    echo "$(basename "$1") OK ($actual)"
  else
    echo "$(basename "$1") checksum $actual does not match $expected" >&2
    exit 1
  fi
}
check "$here/rom/applesoft.bin" "$src/system/applesoft/applesoft.md5"
check "$here/rom/monitor.bin" "$src/system/monitor/apple2plus/monitor.md5"
