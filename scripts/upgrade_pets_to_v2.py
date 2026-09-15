#!/usr/bin/env python3
"""Guardrail for Codex v2 pet migration.

Nuzzle previously fabricated 16 gaze directions by shifting three existing
poses. Those files were structurally v2-shaped but visually invalid. A genuine
v2 atlas must be authored and approved; this script now refuses lossy automatic
conversion and can only validate already-authored candidates.
"""

import argparse
from pathlib import Path
from PIL import Image

ATLAS_SIZE = (1536, 2288)
CELL_SIZE = (192, 208)
STANDARD_ACTIVE_FRAMES = (6, 8, 8, 4, 5, 8, 6, 6, 6)


def cell_populated(alpha, row, column):
    width, height = CELL_SIZE
    return alpha.crop((
        column * width,
        row * height,
        (column + 1) * width,
        (row + 1) * height,
    )).getbbox() is not None


def validate_v2_atlas(path):
    """Check deterministic v2 structure; visual direction QA is still required."""
    path = Path(path)
    with Image.open(path) as source:
        if source.size != ATLAS_SIZE:
            raise ValueError(f"expected 1536x2288, got {source.width}x{source.height}")
        image = source.convert("RGBA")
    alpha = image.getchannel("A")

    for row, active_count in enumerate(STANDARD_ACTIVE_FRAMES):
        for column in range(8):
            should_be_populated = column < active_count or (row == 0 and column == 6)
            populated = cell_populated(alpha, row, column)
            if should_be_populated and not populated:
                raise ValueError(f"required frame row {row}, column {column} is empty")
            if not should_be_populated and populated:
                raise ValueError(f"unused frame row {row}, column {column} is populated")

    for row in (9, 10):
        for column in range(8):
            if not cell_populated(alpha, row, column):
                raise ValueError(f"look frame row {row}, column {column} is empty")

    pixels = image.get_flattened_data()
    if any(alpha_value == 0 and (red or green or blue) for red, green, blue, alpha_value in pixels):
        raise ValueError("fully transparent pixels contain non-zero RGB residue")
    return True


def upgrade_all_pets():
    raise RuntimeError(
        "Automatic v1→v2 synthesis is disabled because shifted sprites are not "
        "genuine gaze directions. Author v2 atlases, validate them with the "
        "hatch-pet validator, and visually approve all 16 directions."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("atlases", nargs="*", type=Path, help="already-authored v2 atlases to validate")
    args = parser.parse_args()
    if not args.atlases:
        parser.error("automatic conversion is disabled; pass authored v2 atlases to validate")
    for atlas in args.atlases:
        try:
            validate_v2_atlas(atlas)
        except (OSError, ValueError) as error:
            raise SystemExit(f"INVALID {atlas}: {error}") from error
        print(f"STRUCTURALLY VALID {atlas} (visual direction QA still required)")


if __name__ == "__main__":
    main()
