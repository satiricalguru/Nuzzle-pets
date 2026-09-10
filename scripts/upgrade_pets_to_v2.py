#!/usr/bin/env python3
"""
upgrade_pets_to_v2.py — Upgrade all pets to the latest Codex v2 specification
with 16 look directions, 8x11 extended atlas (1536x2288), and spriteVersionNumber: 2.
"""

import os
import json
import math
import shutil
from pathlib import Path
from PIL import Image

COLUMNS = 8
STANDARD_ROWS = 9
EXTENDED_ROWS = 11
CELL_WIDTH = 192
CELL_HEIGHT = 208
ATLAS_WIDTH = COLUMNS * CELL_WIDTH     # 1536
ATLAS_HEIGHT = EXTENDED_ROWS * CELL_HEIGHT # 2288

LOOK_DIRECTION_ANGLES = [
    0.0, 22.5, 45.0, 67.5, 90.0, 112.5, 135.0, 157.5,
    180.0, 202.5, 225.0, 247.5, 270.0, 292.5, 315.0, 337.5
]

WORKSPACE_DIR = Path(__file__).resolve().parents[1]
PUBLIC_PETS_DIR = WORKSPACE_DIR / "public" / "pets"
CODEX_PETS_DIR = Path.home() / ".codex" / "pets"

def extract_cell(img: Image.Image, row: int, col: int, src_cols: int = 8, src_rows: int = 9) -> Image.Image:
    """Extract a cell from an image and resize/fit it into 192x208."""
    w, h = img.size
    cell_w = w / src_cols
    cell_h = h / src_rows
    
    left = int(col * cell_w)
    top = int(row * cell_h)
    right = int((col + 1) * cell_w)
    bottom = int((row + 1) * cell_h)
    
    cropped = img.crop((left, top, right, bottom))
    cell = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT), (0, 0, 0, 0))
    
    bbox = cropped.getbbox()
    if bbox:
        sprite = cropped.crop(bbox)
        # Scale to fit nicely with padding
        max_w = CELL_WIDTH - 12
        max_h = CELL_HEIGHT - 12
        scale = min(max_w / sprite.width, max_h / sprite.height, 1.0)
        new_w = max(1, round(sprite.width * scale))
        new_h = max(1, round(sprite.height * scale))
        resized = sprite.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        pos_x = (CELL_WIDTH - new_w) // 2
        pos_y = CELL_HEIGHT - new_h - 6  # align near bottom
        cell.alpha_composite(resized, (pos_x, pos_y))
        
    return cell

def generate_look_cell(neutral_cell: Image.Image, right_cell: Image.Image, left_cell: Image.Image, angle: float) -> Image.Image:
    """Synthesize a directional gaze frame for a given angle in [0, 360)."""
    # 0 = Up, 90 = Right, 180 = Down (Front/Neutral), 270 = Left
    cell = Image.new("RGBA", (CELL_WIDTH, CELL_HEIGHT), (0, 0, 0, 0))
    
    # Horizontal component: -1 (full left) to +1 (full right)
    # Vertical component: -1 (full up) to +1 (full down)
    rad = math.radians(angle)
    # In screen coords: 0 deg is Up (x=0, y=-1), 90 is Right (x=1, y=0), 180 is Down (x=0, y=1), 270 is Left (x=-1, y=0)
    dx = math.sin(rad)
    dy = -math.cos(rad)
    
    # Choose base pose based on dominant horizontal direction
    if dx > 0.35:
        base = right_cell
    elif dx < -0.35:
        base = left_cell
    else:
        base = neutral_cell
        
    bbox = base.getbbox()
    if not bbox:
        return cell
        
    sprite = base.crop(bbox)
    
    # Apply subtle shift to emphasize gaze direction
    shift_x = round(dx * 4.0)
    shift_y = round(dy * 3.5)
    
    base_pos_x = (CELL_WIDTH - sprite.width) // 2 + shift_x
    base_pos_y = CELL_HEIGHT - sprite.height - 6 + shift_y
    
    cell.alpha_composite(sprite, (base_pos_x, base_pos_y))
    return cell

def build_v2_atlas(src_path: Path) -> Image.Image:
    """Build an 8x11 extended atlas (1536x2288) from an existing sprite image."""
    src_img = Image.open(src_path).convert("RGBA")
    atlas = Image.new("RGBA", (ATLAS_WIDTH, ATLAS_HEIGHT), (0, 0, 0, 0))
    
    is_gif = src_path.suffix.lower() == ".gif"
    
    if is_gif:
        # For GIF, fit single frame into cells
        neutral = extract_cell(src_img, 0, 0, src_cols=1, src_rows=1)
        right = neutral
        left = neutral.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        
        for row in range(STANDARD_ROWS):
            for col in range(COLUMNS):
                atlas.alpha_composite(neutral, (col * CELL_WIDTH, row * CELL_HEIGHT))
    else:
        # Standard 8x9 atlas: if already 1536x1872, composite directly for pristine pixel art
        if src_img.size == (ATLAS_WIDTH, STANDARD_ROWS * CELL_HEIGHT):
            atlas.alpha_composite(src_img, (0, 0))
            neutral = src_img.crop((0, 0, CELL_WIDTH, CELL_HEIGHT))
            right = src_img.crop((0, CELL_HEIGHT, CELL_WIDTH, 2 * CELL_HEIGHT))
            left = src_img.crop((0, 2 * CELL_HEIGHT, CELL_WIDTH, 3 * CELL_HEIGHT))
        else:
            for row in range(STANDARD_ROWS):
                for col in range(COLUMNS):
                    c = extract_cell(src_img, row, col, src_cols=8, src_rows=9)
                    atlas.alpha_composite(c, (col * CELL_WIDTH, row * CELL_HEIGHT))
            neutral = extract_cell(src_img, 0, 0, src_cols=8, src_rows=9)
            right = extract_cell(src_img, 1, 0, src_cols=8, src_rows=9)
            left = extract_cell(src_img, 2, 0, src_cols=8, src_rows=9)
        
        if not left.getbbox():
            left = right.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if not right.getbbox():
            right = neutral
    
    # Populate Rows 9 & 10 (16 look directions)
    for idx, angle in enumerate(LOOK_DIRECTION_ANGLES):
        row = STANDARD_ROWS + idx // COLUMNS
        col = idx % COLUMNS
        look_c = generate_look_cell(neutral, right, left, angle)
        atlas.alpha_composite(look_c, (col * CELL_WIDTH, row * CELL_HEIGHT))
        
    return atlas

def upgrade_all_pets():
    print("🚀 Upgrading all companions to Codex v2 (8x11 extended atlas, spriteVersionNumber: 2, 16 look directions)...")
    
    from setup_codex import PETS_DATA
    
    CODEX_PETS_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    
    for pet in PETS_DATA:
        pet_id = pet["id"]
        pet_name = pet["name"]
        pet_desc = pet["desc"]
        ext = pet["ext"]
        
        target_dir = CODEX_PETS_DIR / pet_id
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Source sprite
        src_file = PUBLIC_PETS_DIR / f"{pet_id}.{ext}"
        if not src_file.exists():
            print(f"⚠️ Source file missing for {pet_id}: {src_file}")
            continue
            
        # Build 11-row extended atlas
        v2_atlas = build_v2_atlas(src_file)
        
        # Save as spritesheet.webp in ~/.codex/pets/<id>/
        out_webp = target_dir / "spritesheet.webp"
        v2_atlas.save(out_webp, format="WEBP", lossless=True, quality=100, method=6)
        
        # Write official v2 pet.json
        manifest = {
            "id": pet_id,
            "displayName": pet_name,
            "description": pet_desc,
            "spritesheetPath": "spritesheet.webp",
            "spriteVersionNumber": 2,
            "spritesheetLayout": {
                "columns": COLUMNS,
                "rows": EXTENDED_ROWS,
                "cellWidth": CELL_WIDTH,
                "cellHeight": CELL_HEIGHT,
                "lookDirectionCount": len(LOOK_DIRECTION_ANGLES),
                "neutralLookFrame": {
                    "rowIndex": 0,
                    "columnIndex": 0
                }
            },
            "lookDirections": [
                {
                    "degrees": angle,
                    "rowIndex": STANDARD_ROWS + i // COLUMNS,
                    "columnIndex": i % COLUMNS
                }
                for i, angle in enumerate(LOOK_DIRECTION_ANGLES)
            ]
        }
        
        with open(target_dir / "pet.json", "w") as f:
            json.dump(manifest, f, indent=2)
            
        count += 1
        print(f"  ✓ Upgraded {pet_name} ({pet_id}) to v2 (1536x2288, 16 look directions)")
        
    print(f"\n🎉 Successfully upgraded {count} pets in ~/.codex/pets/ to latest Codex v2 with full looking directions!")

if __name__ == "__main__":
    upgrade_all_pets()
