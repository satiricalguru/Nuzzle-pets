#!/usr/bin/env python3
"""Generate lightweight idle-row thumbnails for the bundled pet atlases.

Library grids animate these 1536x208 idle strips instead of decoding every full
1536x1872 atlas (~11 MiB of bitmap memory each), which keeps the studio light
on memory and battery. Run after adding or replacing a pet atlas.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PETS_DIR = ROOT / "public" / "pets"
THUMBS_DIR = PETS_DIR / "thumbs"
CELL_WIDTH, CELL_HEIGHT, COLUMNS = 192, 208, 8
SCALE = 1.0


def thumb_for(atlas: Path) -> Image.Image:
    with Image.open(atlas) as source:
        idle_row = source.convert("RGBA").crop((0, 0, CELL_WIDTH * COLUMNS, CELL_HEIGHT))
    size = (int(CELL_WIDTH * COLUMNS * SCALE), int(CELL_HEIGHT * SCALE))
    return idle_row.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if any thumbnail is missing")
    args = parser.parse_args()

    THUMBS_DIR.mkdir(exist_ok=True)
    stale = []
    for atlas in sorted(PETS_DIR.glob("*.webp")):
        target = THUMBS_DIR / atlas.name
        # Git checkouts reset mtimes, so --check only requires presence.
        if target.exists() and (args.check or target.stat().st_mtime >= atlas.stat().st_mtime):
            continue
        stale.append(atlas.name)
        if not args.check:
            thumb_for(atlas).save(target, format="WEBP", quality=78, alpha_quality=90, method=6)

    if args.check:
        if stale:
            raise SystemExit(f"Stale or missing thumbnails: {', '.join(stale)}")
        print("Thumbnails up to date")
        return
    total = sum(path.stat().st_size for path in THUMBS_DIR.glob("*.webp"))
    print(f"Updated {len(stale)} thumbnails ({total / 1024:.0f} KiB total in {THUMBS_DIR.relative_to(ROOT)})")


if __name__ == "__main__":
    main()
