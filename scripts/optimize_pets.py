#!/usr/bin/env python3
"""Convert lossless bundled atlases to visually lossless WebP release assets."""

from __future__ import annotations

import argparse
import math
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parents[1]
PETS_DIR = ROOT / "public" / "pets"
MIN_VISIBLE_PSNR = 30.0


def webp_is_lossless(path: Path) -> bool:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError(f"not a WebP file: {path}")
    offset = 12
    while offset + 8 <= len(data):
        kind = data[offset : offset + 4]
        size = int.from_bytes(data[offset + 4 : offset + 8], "little")
        if kind == b"VP8L":
            return True
        if kind == b"VP8 ":
            return False
        offset += 8 + size + (size % 2)
    raise ValueError(f"WebP has no image payload: {path}")


def visible_psnr(before: Image.Image, after: Image.Image) -> float:
    scores = []
    for background in ((255, 255, 255, 255), (32, 32, 32, 255)):
        backdrop = Image.new("RGBA", before.size, background)
        visible_before = Image.alpha_composite(backdrop, before).convert("RGB")
        visible_after = Image.alpha_composite(backdrop, after).convert("RGB")
        rms = ImageStat.Stat(ImageChops.difference(visible_before, visible_after)).rms
        scores.append(
            sum(20 * math.log10(255 / max(channel, 1e-9)) for channel in rms) / 3
        )
    return min(scores)


def optimize(path: Path, quality: int) -> tuple[str, int, int, float]:
    original_size = path.stat().st_size
    if not webp_is_lossless(path):
        return path.name, original_size, original_size, math.inf

    with Image.open(path) as source:
        image = source.convert("RGBA")
    handle = tempfile.NamedTemporaryFile(
        dir=path.parent, prefix=f".{path.stem}-", suffix=".webp", delete=False
    )
    candidate = Path(handle.name)
    handle.close()
    try:
        image.save(
            candidate,
            format="WEBP",
            quality=quality,
            alpha_quality=100,
            method=6,
        )
        with Image.open(candidate) as encoded:
            decoded = encoded.convert("RGBA")
        if decoded.size != image.size:
            raise ValueError(f"{path.name}: dimensions changed during optimization")
        if ImageChops.difference(image.getchannel("A"), decoded.getchannel("A")).getbbox():
            raise ValueError(f"{path.name}: alpha channel changed during optimization")
        psnr = visible_psnr(image, decoded)
        if psnr < MIN_VISIBLE_PSNR:
            raise ValueError(
                f"{path.name}: visible PSNR {psnr:.2f} dB is below {MIN_VISIBLE_PSNR:.2f} dB"
            )
        optimized_size = candidate.stat().st_size
        if optimized_size >= original_size:
            return path.name, original_size, original_size, psnr
        os.replace(candidate, path)
        return path.name, original_size, optimized_size, psnr
    finally:
        candidate.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quality", type=int, default=92, choices=range(80, 101), metavar="80-100")
    parser.add_argument("--jobs", type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail when any bundled atlas is still lossless instead of rewriting files",
    )
    args = parser.parse_args()

    paths = sorted(PETS_DIR.glob("*.webp"))
    lossless = [path for path in paths if webp_is_lossless(path)]
    if args.check:
        print(f"Release-optimized atlases: {len(paths) - len(lossless)}/{len(paths)}")
        if lossless:
            print("Lossless atlases still needing optimization:")
            for path in lossless:
                print(f"  {path.name}")
            raise SystemExit(1)
        return

    before = sum(path.stat().st_size for path in paths)
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as executor:
        results = list(executor.map(lambda path: optimize(path, args.quality), paths))
    after = sum(path.stat().st_size for path in paths)
    changed = sum(old != new for _, old, new, _ in results)
    finite_psnr = [psnr for _, old, new, psnr in results if old != new and math.isfinite(psnr)]
    saved = before - after
    print(
        f"Optimized {changed}/{len(paths)} atlases: "
        f"{before / 1_048_576:.1f} MiB -> {after / 1_048_576:.1f} MiB "
        f"({saved / before:.1%} smaller)"
    )
    if finite_psnr:
        print(f"Minimum visible RGB PSNR: {min(finite_psnr):.2f} dB; alpha channels unchanged")


if __name__ == "__main__":
    main()
