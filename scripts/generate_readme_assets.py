#!/usr/bin/env python3
"""
generate_readme_assets.py — Generates custom, high-definition animated GIF banners
and gallery posters for the Nuzzle README.md with perfect frame looping and smooth timing.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WORKSPACE_DIR = Path(__file__).resolve().parents[1]
PUBLIC_PETS_DIR = WORKSPACE_DIR / "public" / "pets"
ASSETS_DIR = WORKSPACE_DIR / "assets"
ASSETS_DIR.mkdir(exist_ok=True)

CELL_W = 192
CELL_H = 208

# 24-frame loop aligns cleanly with 4, 6, and 8 frame animations
TOTAL_FRAMES = 24
FRAME_DURATION_MS = 220  # Smooth, relaxed, visible pacing

def get_active_frame_indices(pet_id: str, row: int) -> list:
    src_file = PUBLIC_PETS_DIR / f"{pet_id}.webp"
    if not src_file.exists():
        raise FileNotFoundError(f"Missing {src_file}")
    img = Image.open(src_file).convert("RGBA")
    active = []
    for c in range(8):
        cell = img.crop((c * CELL_W, row * CELL_H, (c + 1) * CELL_W, (row + 1) * CELL_H))
        if cell.getbbox() is not None:
            active.append(c)
    return active if active else [0]

def get_pet_frame(pet_id: str, row: int, col: int) -> Image.Image:
    src_file = PUBLIC_PETS_DIR / f"{pet_id}.webp"
    img = Image.open(src_file).convert("RGBA")
    return img.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))

def create_hero_animated_gif():
    print("🎨 Creating assets/nuzzle-hero-animated.gif (Smooth 24-frame loop, 220ms)...")
    
    pets = [
        {"id": "anya", "name": "Anya", "tag": "Waku Waku", "row": 0, "color": "#f472b6"},
        {"id": "hu-tao", "name": "Hu Tao", "tag": "Pyro · Chaos", "row": 0, "color": "#ef4444"},
        {"id": "copet-neo", "name": "CoPet Neo", "tag": "Classic Mascot", "row": 0, "color": "#38bdf8"},
        {"id": "furina", "name": "Furina", "tag": "Hydro · Drama", "row": 0, "color": "#60a5fa"},
        {"id": "klee", "name": "Klee", "tag": "Spark Knight", "row": 0, "color": "#fb923c"},
        {"id": "dragon", "name": "Azure Dragon", "tag": "Mythic Beast", "row": 0, "color": "#4ade80"},
    ]
    
    # Pre-calculate active frame lists for each pet so characters NEVER disappear
    for pet in pets:
        pet["active_cols"] = get_active_frame_indices(pet["id"], pet["row"])
    
    width = 840
    height = 290
    frames = []
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 15)
        font_name = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 13)
        font_tag = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 11)
        font_status = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 11)
    except:
        font_title = ImageFont.load_default()
        font_name = font_title
        font_tag = font_title
        font_status = font_title

    for frame_idx in range(TOTAL_FRAMES):
        base = Image.new("RGBA", (width, height), (15, 15, 18, 255))
        draw = ImageDraw.Draw(base)
        
        # Container
        card_rect = [12, 12, width - 12, height - 12]
        draw.rounded_rectangle(card_rect, radius=16, fill=(24, 24, 30, 255), outline=(45, 45, 58, 255), width=1)
        
        # Header bar
        draw.text((32, 24), "🐾 NUZZLE", fill=(250, 250, 250, 255), font=font_title)
        draw.text((115, 25), "· 42 AI Coding Companions", fill=(160, 160, 175, 255), font=font_status)
        
        # Status badge
        badge_rect = [width - 240, 22, width - 32, 42]
        draw.rounded_rectangle(badge_rect, radius=10, fill=(38, 38, 48, 255), outline=(60, 60, 75, 255), width=1)
        draw.ellipse([width - 230, 29, width - 222, 37], fill=(52, 211, 153, 255))
        draw.text((width - 214, 26), "Codex v1 + v2", fill=(220, 220, 230, 255), font=font_status)
        
        draw.line([28, 52, width - 28, 52], fill=(36, 36, 46, 255), width=1)
        
        slot_width = (width - 48) // len(pets)
        for i, pet in enumerate(pets):
            center_x = 24 + i * slot_width + slot_width // 2
            
            # Pedestal
            ped_w = 80
            ped_y = 205
            draw.ellipse([center_x - ped_w // 2, ped_y, center_x + ped_w // 2, ped_y + 14], fill=(32, 32, 42, 255), outline=(50, 50, 65, 255), width=1)
            
            # Continuous valid frame cycling
            active_cols = pet["active_cols"]
            col = active_cols[frame_idx % len(active_cols)]
            sprite = get_pet_frame(pet["id"], pet["row"], col)
            
            bbox = sprite.getbbox()
            if bbox:
                cropped = sprite.crop(bbox)
                target_h = 135
                target_w = round(cropped.width * (target_h / cropped.height))
                scaled = cropped.resize((target_w, target_h), Image.Resampling.NEAREST)
                
                pos_x = center_x - target_w // 2
                pos_y = ped_y + 8 - target_h
                base.alpha_composite(scaled, (pos_x, pos_y))
                
            draw.text((center_x, 228), pet["name"], fill=(255, 255, 255, 255), font=font_name, anchor="mt")
            draw.text((center_x, 246), pet["tag"], fill=(150, 150, 165, 255), font=font_tag, anchor="mt")

        draw.line([28, 266, width - 28, 266], fill=(30, 30, 40, 255), width=1)
        draw.text((width // 2, 272), "✨ Real-time animations for prompts, tool calls, reviews & errors", fill=(120, 120, 135, 255), font=font_tag, anchor="mt")
        
        rgb_frame = base.convert("RGB")
        p_frame = rgb_frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
        frames.append(p_frame)
        
    out_path = ASSETS_DIR / "nuzzle-hero-animated.gif"
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        optimize=True
    )
    print(f"  ✓ Saved {out_path} ({len(frames)} frames, {FRAME_DURATION_MS}ms duration)")

def create_actions_animated_gif():
    print("🎨 Creating assets/nuzzle-actions-animated.gif (Smooth 24-frame loop, 220ms)...")
    
    states = [
        {"id": "ganyu", "name": "Ganyu", "state_label": "IDLE / WAITING", "row": 0, "sub": "Breathing & Blinking"},
        {"id": "aiko", "name": "Aiko", "state_label": "PAT / WAVING", "row": 3, "sub": "Interaction Reaction"},
        {"id": "shinchan", "name": "Shinchan", "state_label": "RUNNING / TOOL", "row": 1, "sub": "Active Execution"},
        {"id": "regulus-star-antimony", "name": "Regulus", "state_label": "CODE REVIEW", "row": 8, "sub": "Summary & Complete"},
    ]
    
    for s in states:
        s["active_cols"] = get_active_frame_indices(s["id"], s["row"])
    
    width = 840
    height = 240
    frames = []
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 14)
        font_state = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 12)
        font_sub = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 11)
    except:
        font_title = ImageFont.load_default()
        font_state = font_title
        font_sub = font_title

    for frame_idx in range(TOTAL_FRAMES):
        base = Image.new("RGBA", (width, height), (15, 15, 18, 255))
        draw = ImageDraw.Draw(base)
        
        card_rect = [12, 12, width - 12, height - 12]
        draw.rounded_rectangle(card_rect, radius=16, fill=(24, 24, 30, 255), outline=(45, 45, 58, 255), width=1)
        
        draw.text((width // 2, 24), "⚡ LIFECYCLE ACTION & ANIMATION STATES", fill=(240, 240, 245, 255), font=font_title, anchor="mt")
        draw.line([28, 46, width - 28, 46], fill=(36, 36, 46, 255), width=1)
        
        slot_width = (width - 48) // len(states)
        for i, s in enumerate(states):
            center_x = 24 + i * slot_width + slot_width // 2
            
            # State badge
            bw = 140
            bh = 22
            by = 56
            draw.rounded_rectangle([center_x - bw // 2, by, center_x + bw // 2, by + bh], radius=8, fill=(35, 35, 45, 255), outline=(55, 55, 70, 255), width=1)
            draw.text((center_x, by + 4), s["state_label"], fill=(255, 255, 255, 255), font=font_state, anchor="mt")
            
            # Pedestal
            ped_w = 70
            ped_y = 180
            draw.ellipse([center_x - ped_w // 2, ped_y, center_x + ped_w // 2, ped_y + 12], fill=(30, 30, 40, 255), outline=(48, 48, 60, 255), width=1)
            
            # Continuous valid frame cycling
            active_cols = s["active_cols"]
            col = active_cols[frame_idx % len(active_cols)]
            sprite = get_pet_frame(s["id"], s["row"], col)
            
            bbox = sprite.getbbox()
            if bbox:
                cropped = sprite.crop(bbox)
                target_h = 100
                target_w = round(cropped.width * (target_h / cropped.height))
                scaled = cropped.resize((target_w, target_h), Image.Resampling.NEAREST)
                pos_x = center_x - target_w // 2
                pos_y = ped_y + 6 - target_h
                base.alpha_composite(scaled, (pos_x, pos_y))
                
            draw.text((center_x, 196), f"{s['name']} · {s['sub']}", fill=(160, 160, 175, 255), font=font_sub, anchor="mt")
            
        rgb_frame = base.convert("RGB")
        p_frame = rgb_frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
        frames.append(p_frame)
        
    out_path = ASSETS_DIR / "nuzzle-actions-animated.gif"
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        optimize=True
    )
    print(f"  ✓ Saved {out_path} ({len(frames)} frames, {FRAME_DURATION_MS}ms duration)")

def create_catalog_poster():
    print("🎨 Creating assets/nuzzle-catalog-poster.png...")
    
    pets = [
        {"id": "hu-tao", "name": "Hu Tao", "sub": "Pyro · Chaos"},
        {"id": "furina", "name": "Furina", "sub": "Hydro · Drama"},
        {"id": "raiden", "name": "Raiden", "sub": "Electro · Zen"},
        {"id": "ganyu", "name": "Ganyu", "sub": "Cryo · Gentle"},
        {"id": "klee", "name": "Klee", "sub": "Pyro · Spark"},
        {"id": "anya", "name": "Anya", "sub": "Esper · Pink"},
        {"id": "copet-neo", "name": "CoPet Neo", "sub": "Digital · OG"},
        {"id": "copet-mecha", "name": "Mecha", "sub": "Armor · Power"},
        {"id": "dragon", "name": "Azure Dragon", "sub": "Mythic Beast"},
        {"id": "orange-cat", "name": "Orange Cat", "sub": "Cozy Napper"},
        {"id": "march-7th", "name": "March 7th", "sub": "Cryo · Star"},
        {"id": "kid", "name": "Kid", "sub": "Magic · Thief"}
    ]
    
    width = 840
    height = 430
    
    base = Image.new("RGBA", (width, height), (15, 15, 18, 255))
    draw = ImageDraw.Draw(base)
    
    card_rect = [12, 12, width - 12, height - 12]
    draw.rounded_rectangle(card_rect, radius=16, fill=(22, 22, 28, 255), outline=(45, 45, 58, 255), width=1)
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 16)
        font_name = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 13)
        font_sub = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 10)
        font_head = ImageFont.truetype("/System/Library/Fonts/SFProRounded.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_name = font_title
        font_sub = font_title
        font_head = font_title
        
    draw.text((32, 24), "🎨 42 COMPANIONS CATALOG PREVIEW", fill=(255, 255, 255, 255), font=font_title)
    draw.text((width - 32, 26), "Anime · Mascots · Animals · Zodiac", fill=(140, 140, 155, 255), font=font_head, anchor="rt")
    draw.line([28, 52, width - 28, 52], fill=(36, 36, 46, 255), width=1)
    
    cols = 6
    rows = 2
    grid_w = width - 48
    col_w = grid_w // cols
    row_h = 165
    
    for idx, pet in enumerate(pets):
        c = idx % cols
        r = idx // cols
        
        box_x = 24 + c * col_w + 4
        box_y = 64 + r * row_h
        box_w = col_w - 8
        box_h = row_h - 10
        
        draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=12, fill=(28, 28, 36, 255), outline=(48, 48, 62, 255), width=1)
        
        sprite = get_pet_frame(pet["id"], 0, 0)
        bbox = sprite.getbbox()
        if bbox:
            cropped = sprite.crop(bbox)
            target_h = 82
            target_w = round(cropped.width * (target_h / cropped.height))
            scaled = cropped.resize((target_w, target_h), Image.Resampling.NEAREST)
            pos_x = box_x + (box_w - target_w) // 2
            pos_y = box_y + 12
            base.alpha_composite(scaled, (pos_x, pos_y))
            
        draw.text((box_x + box_w // 2, box_y + 104), pet["name"], fill=(245, 245, 250, 255), font=font_name, anchor="mt")
        draw.text((box_x + box_w // 2, box_y + 124), pet["sub"], fill=(140, 140, 155, 255), font=font_sub, anchor="mt")
        
    out_path = ASSETS_DIR / "nuzzle-catalog-poster.png"
    base.convert("RGB").save(out_path, format="PNG", optimize=True)
    print(f"  ✓ Saved {out_path}")

if __name__ == "__main__":
    create_hero_animated_gif()
    create_actions_animated_gif()
    create_catalog_poster()
    print("\n🎉 Fresh README assets created with smooth 220ms pacing & no flashing!")
