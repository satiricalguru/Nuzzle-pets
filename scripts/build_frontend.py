#!/usr/bin/env python3
"""Build the dependency-free Nuzzle web UI consumed by Tauri."""

from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
FILES = ("index.html", "mini.html", "styles.css", "app.js")


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

    print(f"Built native frontend at {DIST} ({len(list((DIST / 'pets').glob('*')))} pets)")


if __name__ == "__main__":
    main()
