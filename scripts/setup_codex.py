#!/usr/bin/env python3
"""
setup_codex.py — Auto-configure Codex with all 42 Nuzzle / CoPet companions
and setup lifecycle event hooks in ~/.codex/
"""

import os
import json
import shutil
from pathlib import Path

CODEX_DIR = Path.home() / ".codex"
CODEX_PETS_DIR = CODEX_DIR / "pets"
WORKSPACE_DIR = Path(__file__).resolve().parents[1]
PUBLIC_PETS_DIR = WORKSPACE_DIR / "public" / "pets"
TMP_ANIME_PETS_DIR = Path("/tmp/codex-anime-pets/pets")

# Pet catalog metadata
PETS_DATA = [
  {"id": "hu-tao", "name": "Hu Tao", "ext": "webp", "desc": "Spirited pyro companion for Codex"},
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

def auto_set_codex():
    print(f"🐾 Setting up Codex v2 companions in: {CODEX_PETS_DIR}")
    from upgrade_pets_to_v2 import upgrade_all_pets
    upgrade_all_pets()

    # Setup Codex Hook forwarding
    hooks_file = CODEX_DIR / "hooks.json"
    print(f"🔗 Checking Codex hook config in: {hooks_file}")
    
    existing_hooks = {}
    if hooks_file.exists():
        try:
            with open(hooks_file, "r") as f:
                existing_hooks = json.load(f)
        except Exception:
            existing_hooks = {}

    # Add Nuzzle lifecycle notification hook
    existing_hooks["nuzzle"] = {
        "description": "Nuzzle Companion Studio Lifecycle Listener",
        "url": "http://127.0.0.1:4173/events",
        "events": ["prompt", "tool_use", "thinking", "completion", "error"]
    }

    with open(hooks_file, "w") as f:
        json.dump(existing_hooks, f, indent=2)
    print("✅ Configured ~/.codex/hooks.json for automatic agent event reaction via http://127.0.0.1:4173/events!")

if __name__ == "__main__":
    auto_set_codex()
