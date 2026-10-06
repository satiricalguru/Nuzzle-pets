#!/usr/bin/env python3
"""Snapshot the public codexpets.net gallery into a compact, bundled catalog.

Only metadata is bundled (names, tags, sprite URLs). Sprite atlases stay on the
CodexPets CDN and are downloaded on demand when a user installs a pet, which
keeps the Nuzzle app small.

Usage: python3 scripts/sync_codexpets_catalog.py [--max-pages N]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "catalog" / "codexpets.json"
GALLERY = "https://codexpets.net/gallery?page={page}"
CDN_PREFIX = "https://pub-4976a79db284484f8d370de741d18cf9.r2.dev/codex-pets/"
USER_AGENT = "NuzzleCatalogSync/1.0 (+https://github.com/satiricalguru/Nuzzle-pets)"
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")

# Ordered: the first matching section wins. Each entry is (section, tags, words
# that also count when they appear in the name or description).
SECTIONS = (
    ("anime", {"anime"}, ()),
    ("animals", {"animal", "dog", "puppy", "duck", "dino"}, (
        "cat", "kitten", "kitty", "dog", "puppy", "fox", "bunny", "rabbit", "bear", "panda",
        "penguin", "duck", "bird", "frog", "hamster", "mouse", "dino", "dinosaur", "dragon",
        "owl", "otter", "capybara", "shiba", "corgi", "wolf", "tiger", "lion", "monkey", "pig",
        "cow", "axolotl", "seal", "whale", "fish", "turtle", "hedgehog", "raccoon", "koala",
        "sloth", "squirrel", "chick", "chicken", "goat", "horse", "sheep", "lamb", "crab",
    )),
    ("robots", {"robot", "utility"}, ("robot", "mecha", "drone", "android", "cyborg")),
    ("game", {"game"}, ()),
    ("celeb", {"celeb", "leader"}, ()),
    ("spooky", {"spooky", "weird", "chaotic"}, ("ghost", "skull", "zombie", "demon")),
    ("pixel", {"pixel", "retro"}, ()),
)
DEFAULT_SECTION = "cute"


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def extract_records(html: str) -> list[dict]:
    # Next.js streams the payload in chunks that can split a record; stitch them back.
    text = re.sub(r'"\]\)</script><script>self\.__next_f\.push\(\[1,"', "", html)
    text = text.replace('\\"', '"')
    records = []
    for match in re.finditer(r'\{"pet":(\{"key":.*?"downloadFilename":"[^"]*"\})\}', text):
        try:
            records.append(json.loads(match.group(1)))
        except json.JSONDecodeError:
            continue
    return records


def section_for(tags: list[str], text: str) -> str:
    lowered = {tag.lower() for tag in tags}
    words = set(re.findall(r"[a-z]+", text))
    for name, section_tags, section_words in SECTIONS:
        if lowered & section_tags or words & set(section_words):
            return name
    return DEFAULT_SECTION


def compact(record: dict) -> dict | None:
    slug = str(record.get("slug", "")).lower()
    sheet = str(record.get("spritesheetUrl", ""))
    if not SLUG.match(slug) or not sheet.startswith(CDN_PREFIX):
        return None
    tags = [str(tag).lower() for tag in record.get("tags", [])][:6]
    name = str(record.get("name", slug)).strip()[:48]
    description = re.sub(r"\s+", " ", str(record.get("description", ""))).strip()[:180]
    return {
        "slug": slug,
        "name": name,
        "description": description,
        "tags": tags,
        "section": section_for(tags, f"{name} {description}".lower()),
        "author": str(record.get("contributorName", "CodexPets.net"))[:40],
        "sheet": sheet[len(CDN_PREFIX):],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-pages", type=int, default=80)
    parser.add_argument("--delay", type=float, default=0.4, help="seconds between requests")
    args = parser.parse_args()

    pets: dict[str, dict] = {}
    for page in range(1, args.max_pages + 1):
        records = extract_records(fetch(GALLERY.format(page=page)))
        added = 0
        for record in records:
            item = compact(record)
            if item and item["slug"] not in pets:
                pets[item["slug"]] = item
                added += 1
        print(f"page {page}: {len(records)} records, {added} new", file=sys.stderr)
        if not records or not added:
            break
        time.sleep(args.delay)

    if not pets:
        raise SystemExit("No pets found; the gallery format may have changed.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": "https://codexpets.net/gallery",
        "cdn": CDN_PREFIX,
        "syncedAt": time.strftime("%Y-%m-%d"),
        "pets": list(pets.values()),
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    counts: dict[str, int] = {}
    for pet in pets.values():
        counts[pet["section"]] = counts.get(pet["section"], 0) + 1
    print(f"Wrote {len(pets)} pets to {OUTPUT.relative_to(ROOT)} "
          f"({OUTPUT.stat().st_size / 1024:.0f} KiB): {counts}")


if __name__ == "__main__":
    main()
