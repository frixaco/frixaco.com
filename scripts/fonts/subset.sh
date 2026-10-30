#!/bin/sh
# Cuts Paper Mono (the full variable font here, OFL) into what the site serves from public/fonts,
# two files by unicode-range, every weight kept (limiting the weight axis re-rounds the outlines
# of 500 and up): Latin with punctuation and arrows (preloaded, every page), and the rest, which
# a browser fetches only for a page that uses those characters. The unicode-range lists in
# tokens.css follow these two cuts: re-check them if the cut changes.
# Needs fonttools and brotli: pip install fonttools brotli
set -e
cd "$(dirname "$0")"
LATIN="U+0000-00FF,U+2000-206F,U+2190-21FF,U+2212"
pyftsubset PaperMono-Variable.woff2 --unicodes="$LATIN" --layout-features='*' --flavor=woff2 \
  --output-file=../../public/fonts/PaperMono-Latin.woff2
REST=$(python3 -c "
from fontTools.ttLib import TTFont
cmap = TTFont('PaperMono-Variable.woff2').getBestCmap()
latin = lambda c: c <= 0xFF or 0x2000 <= c <= 0x206F or 0x2190 <= c <= 0x21FF or c == 0x2212
print(','.join('U+%04X' % c for c in sorted(cmap) if not latin(c)))")
pyftsubset PaperMono-Variable.woff2 --unicodes="$REST" --layout-features='*' --flavor=woff2 \
  --output-file=../../public/fonts/PaperMono-Rest.woff2
