#!/usr/bin/env python3
"""Audit Nuzzle source atlases without reading or modifying user state."""

import argparse
import json
from pathlib import Path
from PIL import Image

from setup_codex import PETS_DATA, PUBLIC_PETS_DIR, get_codex_dir, validate_atlas


def transparent_rgb_residue(path):
    with Image.open(path) as source:
        image = source.convert("RGBA")
    pixels = image.get_flattened_data()
    return sum(
        1
        for red, green, blue, alpha in pixels
        if alpha == 0 and (red or green or blue)
    )


def audit_sources():
    errors = []
    residue = []
    expected_ids = {pet["id"] for pet in PETS_DATA}
    actual_ids = {path.stem for path in PUBLIC_PETS_DIR.glob("*.webp")}
    if actual_ids != expected_ids:
        missing = sorted(expected_ids - actual_ids)
        extra = sorted(actual_ids - expected_ids)
        if missing:
            errors.append(f"missing source assets: {', '.join(missing)}")
        if extra:
            errors.append(f"uncatalogued source assets: {', '.join(extra)}")

    for pet in PETS_DATA:
        path = PUBLIC_PETS_DIR / f"{pet['id']}.{pet['ext']}"
        try:
            validate_atlas(path, pet.get("spriteVersionNumber", 1))
        except (OSError, ValueError) as error:
            errors.append(f"{pet['id']}: {error}")
            continue
        residue_count = transparent_rgb_residue(path)
        if residue_count:
            residue.append((pet["id"], residue_count))

    print(f"Source atlases structurally valid: {len(PETS_DATA) - len(errors)}/{len(PETS_DATA)}")
    if residue:
        print(f"Transparent-RGB cleanup needed before byte-level packaging: {len(residue)}/{len(PETS_DATA)}")
        for pet_id, count in residue:
            print(f"  warning: {pet_id}: {count} transparent pixels carry RGB residue")
    if errors:
        for error in errors:
            print(f"  error: {error}")
        return 1
    return 0


def audit_installed(codex_dir):
    errors = []
    for pet in PETS_DATA:
        package = codex_dir / "pets" / pet["id"]
        manifest_path = package / "pet.json"
        atlas_path = package / "spritesheet.webp"
        try:
            manifest = json.loads(manifest_path.read_text())
            expected_version = pet.get("spriteVersionNumber")
            if manifest.get("spriteVersionNumber") != expected_version:
                raise ValueError(f"expected spriteVersionNumber {expected_version!r}")
            if manifest.get("id") != pet["id"]:
                raise ValueError("manifest id does not match package directory")
            validate_atlas(atlas_path, pet.get("spriteVersionNumber", 1))
            if transparent_rgb_residue(atlas_path):
                raise ValueError("installed atlas contains transparent RGB residue")
        except (OSError, json.JSONDecodeError, ValueError) as error:
            errors.append(f"{pet['id']}: {error}")
    print(f"Installed packages valid: {len(PETS_DATA) - len(errors)}/{len(PETS_DATA)}")
    for error in errors:
        print(f"  error: {error}")
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--installed",
        action="store_true",
        help="also validate installed packages under CODEX_HOME (read-only)",
    )
    args = parser.parse_args()
    status = audit_sources()
    if args.installed:
        status |= audit_installed(get_codex_dir())
    raise SystemExit(status)


if __name__ == "__main__":
    main()
