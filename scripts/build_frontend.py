#!/usr/bin/env python3
"""Build the dependency-free Nuzzle web UI consumed by Tauri."""

from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
FILES = ("index.html", "mini.html", "styles.css", "app.js", "discover.js", "maker.js")


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    for name in FILES:
        shutil.copy2(ROOT / name, DIST / name)

    public_target = DIST / "public"
    public_target.mkdir()
    shutil.copy2(ROOT / "public" / "nuzzle-logo.svg", public_target / "nuzzle-logo.svg")
    shutil.copytree(ROOT / "public" / "pets", DIST / "pets")
    # Community catalog metadata only; sprite sheets download on demand.
    shutil.copytree(ROOT / "public" / "catalog", DIST / "catalog")

    size = sum(path.stat().st_size for path in DIST.rglob("*") if path.is_file())
    pets = len(list((DIST / "pets").glob("*.webp")))
    print(f"Built native frontend at {DIST} ({pets} pets, {size / 1_048_576:.1f} MiB)")


if __name__ == "__main__":
    main()
