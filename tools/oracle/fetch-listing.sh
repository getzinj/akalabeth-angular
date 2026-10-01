#!/usr/bin/env bash
# Downloads the original Akalabeth listing at a pinned commit into ./listing/ (gitignored) and
# checks it is byte-for-byte the copy the port was written against.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
commit=4347170ba0dfcb3e1934886e8763c9a45e9a57a9
expected=89d07ef8fda0887a80e138da26ff31580f46a04a0aece41e8e1e40c020607d25

mkdir -p "$here/listing"
curl -sSf -o "$here/listing/AKLABETH.TXT" \
  "https://raw.githubusercontent.com/videogamepreservation/akalabeth/$commit/AKLABETH.TXT"
actual="$(sha256sum "$here/listing/AKLABETH.TXT" | cut -d' ' -f1)"
if [ "$actual" = "$expected" ]; then
  echo "AKLABETH.TXT OK"
else
  echo "AKLABETH.TXT checksum $actual does not match $expected" >&2
  exit 1
fi
