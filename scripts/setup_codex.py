#!/usr/bin/env python3
"""Safely install Nuzzle's validated Codex pet atlases.

Hook configuration is owned by the native Nuzzle app, which can preserve and
trust the current Codex hook schema. This script never edits hooks.json.
"""

import argparse
import os
import json
import shutil
import tempfile
import time
from pathlib import Path
from PIL import Image

WORKSPACE_DIR = Path(__file__).resolve().parents[1]
PUBLIC_PETS_DIR = WORKSPACE_DIR / "public" / "pets"
ATLAS_SIZES = {1: (1536, 1872), 2: (1536, 2288)}
CELL_SIZE = (192, 208)
ACTIVE_FRAMES = {
    1: (6, 8, 8, 4, 5, 8, 6, 6, 6),
    2: (7, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8),
}

# Pet catalog metadata
PETS_DATA = [
  {"id": "hu-tao", "name": "Hu Tao", "ext": "webp", "desc": "Spirited pyro companion for Codex", "spriteVersionNumber": 2},
  {"id": "furina", "name": "Furina", "ext": "webp", "desc": "Dramatic hydro companion for Codex"},
  {"id": "raiden", "name": "Raiden", "ext": "webp", "desc": "Focused electro companion for Codex"},
  {"id": "ganyu", "name": "Ganyu", "ext": "webp", "desc": "Gentle cryo companion for Codex"},
  {"id": "klee", "name": "Klee", "ext": "webp", "desc": "Spark Knight explosive companion for Codex"},
  {"id": "anya", "name": "Anya", "ext": "webp", "desc": "Waku waku telepathic companion for Codex"},
  {"id": "aiko", "name": "Aiko", "ext": "webp", "desc": "Curious anemo companion for Codex"},
  {"id": "ayaka", "name": "Ayaka", "ext": "webp", "desc": "Graceful cryo companion for Codex"},
  {"id": "baobao", "name": "Baobao", "ext": "webp", "desc": "Mystic spirit companion from Under One Person"},
  {"id": "chen", "name": "Chen", "ext": "webp", "desc": "Sword operator companion from Arknights"},
  {"id": "conan", "name": "Conan", "ext": "webp", "desc": "Keen detective companion for Codex"},
  {"id": "kid", "name": "Kid", "ext": "webp", "desc": "Phantom thief companion for Codex"},
  {"id": "lappland", "name": "Lappland", "ext": "webp", "desc": "Lone wolf swordswoman from Arknights"},
  {"id": "march-7th", "name": "March 7th", "ext": "webp", "desc": "Cheerful cryo companion from Honkai Star Rail"},
  {"id": "new-covenant-exusiai", "name": "Exusiai", "ext": "webp", "desc": "Angel marksman companion from Arknights"},
  {"id": "phoebe", "name": "Phoebe", "ext": "webp", "desc": "Serene cleric companion from Wuthering Waves"},
  {"id": "regulus-star-antimony", "name": "Regulus", "ext": "webp", "desc": "Radio DJ arcanist from Reverse: 1999"},
  {"id": "shinchan", "name": "Shinchan", "ext": "webp", "desc": "Cheeky unstoppable companion for Codex"},
  {"id": "sonetto", "name": "Sonetto", "ext": "webp", "desc": "Field agent companion from Reverse: 1999"},
  {"id": "vertin", "name": "Vertin", "ext": "webp", "desc": "Timekeeper companion from Reverse: 1999"},
  {"id": "yoimiya", "name": "Yoimiya", "ext": "webp", "desc": "Fireworks maker companion from Genshin Impact"},
  {"id": "zani", "name": "Zani", "ext": "webp", "desc": "Dark spark companion from Wuthering Waves"},
  {"id": "copet-neo", "name": "CoPet Neo", "ext": "webp", "desc": "Original classic CoPet mascot companion"},
  {"id": "copet-nia", "name": "CoPet Nia", "ext": "webp", "desc": "Gentle soul CoPet mascot companion"},
  {"id": "copet-mecha", "name": "CoPet Mecha", "ext": "webp", "desc": "Armored mecha companion from CoPet"},
  {"id": "dj-fuzz", "name": "DJ Fuzz", "ext": "webp", "desc": "Beats and party companion from CoPet"},
  {"id": "dog", "name": "Lucky Dog", "ext": "webp", "desc": "Loyal debug companion from CoPet"},
  {"id": "dragon", "name": "Azure Dragon", "ext": "webp", "desc": "Ancient mythic dragon companion from CoPet"},
  {"id": "duck", "name": "Waddly Duck", "ext": "webp", "desc": "Rubber duck debugging companion from CoPet"},
  {"id": "goat", "name": "Cloud Goat", "ext": "webp", "desc": "Fluffy mountain companion from CoPet"},
  {"id": "goku", "name": "Goku", "ext": "webp", "desc": "Legendary powerful companion from CoPet"},
  {"id": "horse", "name": "Chestnut Horse", "ext": "webp", "desc": "Swift galloping companion from CoPet"},
  {"id": "monkey", "name": "Clever Monkey", "ext": "webp", "desc": "Cheeky trickster companion from CoPet"},
  {"id": "orange-cat", "name": "Orange Cat", "ext": "webp", "desc": "Cozy keyboard napping companion from CoPet"},
  {"id": "ox", "name": "Cream Ox", "ext": "webp", "desc": "Sturdy workhorse companion from CoPet"},
  {"id": "panda", "name": "Panda", "ext": "webp", "desc": "Zen bamboo break companion from CoPet"},
  {"id": "pig", "name": "Blush Pig", "ext": "webp", "desc": "Happy trotter companion from CoPet"},
  {"id": "rabbit", "name": "White Rabbit", "ext": "webp", "desc": "Speed hopper companion from CoPet"},
  {"id": "rat", "name": "Pearl Rat", "ext": "webp", "desc": "Tiny explorer companion from CoPet"},
  {"id": "rooster", "name": "Golden Rooster", "ext": "webp", "desc": "Dawn caller companion from CoPet"},
  {"id": "snake", "name": "Jade Snake", "ext": "webp", "desc": "Elegant serpent companion from CoPet"},
  {"id": "tiger", "name": "Fierce Tiger", "ext": "webp", "desc": "Apex hunter companion from CoPet"}
]


def get_codex_dir():
    configured = os.environ.get("CODEX_HOME")
    return Path(configured).expanduser() if configured else Path.home() / ".codex"


def validate_v1_atlas(path):
    """Return a decoded v1 atlas only when its frame contract is valid."""
    return validate_atlas(path, 1)


def validate_atlas(path, sprite_version=1):
    """Return a decoded atlas only when its declared frame contract is valid."""
    expected_size = ATLAS_SIZES.get(sprite_version)
    active_frames = ACTIVE_FRAMES.get(sprite_version)
    if expected_size is None or active_frames is None:
        raise ValueError(f"unsupported sprite version {sprite_version}")
    with Image.open(path) as source:
        if source.size != expected_size:
            raise ValueError(f"expected {expected_size[0]}x{expected_size[1]}, got {source.width}x{source.height}")
        image = source.convert("RGBA")

    cell_width, cell_height = CELL_SIZE
    atlas_alpha = image.getchannel("A")
    for row, active_count in enumerate(active_frames):
        for column in range(8):
            alpha = atlas_alpha.crop((
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            ))
            populated = alpha.getbbox() is not None
            if column < active_count and not populated:
                raise ValueError(f"required frame row {row}, column {column} is empty")
            if column >= active_count and populated:
                raise ValueError(f"unused frame row {row}, column {column} is populated")
    return image


def write_json_atomic(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", dir=path.parent, prefix=".nuzzle-", delete=False) as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
            temporary = Path(handle.name)
        os.replace(temporary, path)
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)


def save_atlas_atomic(path, image):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".nuzzle-", delete=False) as handle:
        temporary = Path(handle.name)
    try:
        clean = Image.new("RGBA", image.size, (0, 0, 0, 0))
        clean.alpha_composite(image)
        clean.save(temporary, format="WEBP", lossless=True, quality=100, method=6, exact=True)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def backup_existing(target_dir, codex_dir):
    timestamp = str(time.time_ns())
    backup_dir = codex_dir / "nuzzle-backups" / "pets" / timestamp / target_dir.name
    backup_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(target_dir, backup_dir)
    return backup_dir


def install_pet(pet, codex_dir, force=False):
    source = PUBLIC_PETS_DIR / f"{pet['id']}.{pet['ext']}"
    if not source.is_file():
        raise FileNotFoundError(source)
    sprite_version = pet.get("spriteVersionNumber", 1)
    image = validate_atlas(source, sprite_version)
    target_dir = codex_dir / "pets" / pet["id"]
    if target_dir.exists() and not force:
        return "skipped", None
    backup_dir = backup_existing(target_dir, codex_dir) if target_dir.exists() else None
    target_dir.mkdir(parents=True, exist_ok=True)
    save_atlas_atomic(target_dir / "spritesheet.webp", image)
    manifest = {
        "id": pet["id"],
        "displayName": pet["name"],
        "description": pet["desc"],
        "spritesheetPath": "spritesheet.webp",
    }
    if sprite_version == 2:
        manifest["spriteVersionNumber"] = 2
    write_json_atomic(target_dir / "pet.json", manifest)
    return "installed", backup_dir


def auto_set_codex(force=False):
    codex_dir = get_codex_dir()
    print(f"🐾 Installing validated companions in: {codex_dir / 'pets'}")
    installed = 0
    skipped = 0
    for pet in PETS_DATA:
        try:
            result, backup = install_pet(pet, codex_dir, force=force)
        except (FileNotFoundError, OSError, ValueError) as error:
            raise SystemExit(f"Refusing to install {pet['id']}: {error}") from error
        if result == "skipped":
            skipped += 1
            print(f"  · Kept existing {pet['name']} (use --force to replace with a backup)")
        else:
            installed += 1
            suffix = f"; backup: {backup}" if backup else ""
            print(f"  ✓ Installed {pet['name']}{suffix}")
    print(f"\n✅ Installed {installed}; preserved {skipped} existing pet packages.")
    print("Open Nuzzle → Agents → Codex to install and trust lifecycle hooks safely.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="replace existing packages after backing them up")
    auto_set_codex(force=parser.parse_args().force)
