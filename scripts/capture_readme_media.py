#!/usr/bin/env python3
"""Capture the README screenshots, demo GIFs, and tour video from the live studio UI.

Runs the browser preview (scripts/server.py) headlessly with Playwright, then
encodes media with Pillow and ffmpeg. Output goes to assets/.

Usage: python3 scripts/capture_readme_media.py
"""

from __future__ import annotations

import io
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SHOTS = ASSETS / "screenshots"
PETS = ROOT / "public" / "pets"
VIEWPORT = {"width": 1440, "height": 900}
CELL_W, CELL_H = 192, 208

subprocess.run([sys.executable, str(ROOT / "scripts/build_frontend.py")], check=True)
sys.path.insert(0, str(ROOT / "scripts"))
from server import NuzzleBridgeHandler, ThreadedHTTPServer  # noqa: E402

PREP = """
localStorage.setItem('nuzzle_settings_v1', JSON.stringify({launchGreeting: false, petSize: 'm'}));
localStorage.setItem('nuzzle_favorites_v1', JSON.stringify(['hu-tao', 'anya', 'orange-cat']));
localStorage.setItem('nuzzle_selected_pet_v1', JSON.stringify('hu-tao'));
"""


def save_webp(png: bytes, path: Path, width: int = 1600) -> None:
    image = Image.open(io.BytesIO(png)).convert("RGB")
    image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    image.save(path, "WEBP", quality=84, method=6)
    print(f"  {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KiB)")


def open_view(page, view: str) -> None:
    page.evaluate(f"document.querySelector(\".nav-item[data-view='{view}']\").click()")
    page.wait_for_timeout(500)
    page.evaluate("window.scrollTo(0, 0)")


def wait_discover(page, minimum: int = 12) -> None:
    page.wait_for_selector("#discover-results .discover-card")
    page.wait_for_function(
        f"document.querySelectorAll('.discover-art.is-loaded').length >= {minimum}", timeout=60000
    )
    page.wait_for_timeout(400)


def capture_screens(browser, base: str) -> None:
    for scheme in ("light", "dark"):
        context = browser.new_context(viewport=VIEWPORT, device_scale_factor=2, color_scheme=scheme)
        context.add_init_script(PREP)
        page = context.new_page()
        page.goto(base, wait_until="domcontentloaded")
        page.wait_for_timeout(900)
        save_webp(page.screenshot(), SHOTS / f"overview-{scheme}.webp")
        if scheme == "light":
            open_view(page, "library")
            page.evaluate("window.scrollTo(0, 260)")
            page.wait_for_timeout(400)
            save_webp(page.screenshot(), SHOTS / "library.webp")

            open_view(page, "discover")
            page.evaluate("window.scrollTo(0, 400)")
            wait_discover(page, 18)
            save_webp(page.screenshot(), SHOTS / "discover.webp")
            page.locator("#discover-results .discover-art").nth(1).click()
            page.wait_for_timeout(1500)
            save_webp(page.screenshot(), SHOTS / "discover-preview.webp")
            page.keyboard.press("Escape")

            open_view(page, "maker")
            prompt = page.locator("#maker-prompt")
            prompt.fill("a sleepy orange cat with stripes and a tiny crown")
            page.locator("#maker-name").fill("Mochi")
            page.wait_for_timeout(600)
            page.evaluate("window.scrollTo(0, 250)")
            page.wait_for_timeout(300)
            save_webp(page.screenshot(), SHOTS / "maker.webp")
        else:
            open_view(page, "discover")
            page.evaluate("window.scrollTo(0, 400)")
            wait_discover(page, 18)
            save_webp(page.screenshot(), SHOTS / "discover-dark.webp")
        context.close()


def record_tour(browser, base: str) -> None:
    video_dir = Path(tempfile.mkdtemp())
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        color_scheme="dark",
        record_video_dir=str(video_dir),
        record_video_size={"width": 1280, "height": 800},
    )
    context.add_init_script(PREP)
    page = context.new_page()
    page.goto(base, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    page.locator("#pet-me-button").click()
    page.wait_for_timeout(1400)
    page.locator("#simulate-event-button").click()
    page.wait_for_timeout(1600)

    open_view(page, "library")
    page.wait_for_timeout(900)
    page.mouse.wheel(0, 700)
    page.wait_for_timeout(900)
    page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    page.wait_for_timeout(600)
    page.locator(".filter-button[data-filter='animals']").click()
    page.wait_for_timeout(1300)

    open_view(page, "discover")
    page.evaluate("window.scrollTo({top: 380, behavior: 'smooth'})")
    wait_discover(page, 8)
    page.wait_for_timeout(800)
    page.locator("#discover-results .discover-art").nth(1).click()
    page.wait_for_timeout(1300)
    for state in ("run", "pat", "jump", "work"):
        page.locator(f"#discover-modal [data-preview-state='{state}']").click()
        page.wait_for_timeout(1000)
    page.keyboard.press("Escape")
    page.locator("#discover-search").type("cat", delay=120)
    page.wait_for_timeout(1500)

    open_view(page, "maker")
    page.evaluate("window.scrollTo({top: 250, behavior: 'smooth'})")
    page.locator("#maker-prompt").type("a sleepy orange cat with stripes and a tiny crown", delay=45)
    page.wait_for_timeout(1000)
    for state in ("run", "pat", "jump", "work", "review"):
        page.locator(f"#maker-states [data-maker-state='{state}']").click()
        page.wait_for_timeout(900)
    for preset in ("cute", "cool", "funny"):
        page.locator(f"[data-maker-preset='{preset}']").click()
        page.wait_for_timeout(1100)
    video = page.video.path()
    context.close()

    mp4 = ASSETS / "nuzzle-tour.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-vf", "fps=30,format=yuv420p",
         "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", str(mp4)],
        check=True,
    )
    print(f"  {mp4.relative_to(ROOT)} ({mp4.stat().st_size // 1024} KiB)")
    # A sped-up animated WebP of the same tour for inline README playback
    # (far smaller than GIF at the same quality; GitHub renders it inline).
    frames_dir = video_dir / "frames"
    frames_dir.mkdir()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4), "-vf",
                    "setpts=PTS/1.6,fps=10,scale=880:-1:flags=lanczos", str(frames_dir / "%04d.png")], check=True)
    frames = [Image.open(path).convert("RGB") for path in sorted(frames_dir.glob("*.png"))]
    animated = ASSETS / "nuzzle-tour.webp"
    frames[0].save(animated, "WEBP", save_all=True, append_images=frames[1:], duration=100,
                   loop=0, quality=60, method=4)
    print(f"  {animated.relative_to(ROOT)} ({animated.stat().st_size // 1024} KiB)")
    shutil.rmtree(video_dir, ignore_errors=True)


def cells(atlas: Image.Image, row: int, frames: int) -> list[Image.Image]:
    return [atlas.crop((c * CELL_W, row * CELL_H, (c + 1) * CELL_W, (row + 1) * CELL_H)) for c in range(frames)]


def pet_parade(browser, base: str) -> None:
    """Animated banner: bundled pets plus a Pet Maker creation cycling their states."""
    context = browser.new_context(viewport=VIEWPORT)
    page = context.new_page()
    page.goto(base, wait_until="domcontentloaded")
    page.evaluate("document.querySelector(\".nav-item[data-view='maker']\").click()")
    data_url = page.evaluate("""window.nuzzle.maker.renderAtlas({species: 'cat', body: '#f2a65a', accent: '#fff1dc',
        pattern: 'stripes', accessory: 'crown', cheeks: true}).toDataURL('image/png')""")
    context.close()
    import base64
    maker = Image.open(io.BytesIO(base64.b64decode(data_url.split(",", 1)[1]))).convert("RGBA")

    names = ["hu-tao", "furina", "anya", "orange-cat", "panda", "copet-neo"]
    atlases = [Image.open(PETS / f"{name}.webp").convert("RGBA") for name in names] + [maker]
    # (row, frames): idle, run-right, wave, jump, review — 24 frames total per pet.
    script = [(0, 6), (0, 6), (1, 8), (3, 4)]
    scale = 0.62
    w, h = round(CELL_W * scale), round(CELL_H * scale)
    frames = []
    for step in range(24):
        canvas = Image.new("RGBA", (w * len(atlases) + 24, h + 16), (245, 241, 234, 255))
        for index, atlas in enumerate(atlases):
            offset = (step + index * 3) % 24
            row, count = (0, 6) if offset < 12 else ((1, 8) if offset < 18 else (3, 4))
            cell = cells(atlas, row, count)[offset % count].resize((w, h), Image.Resampling.LANCZOS)
            canvas.alpha_composite(cell, (12 + index * w, 8))
        frames.append(canvas.convert("RGB").quantize(colors=200, method=Image.Quantize.MEDIANCUT))
    out = ASSETS / "nuzzle-pets-parade.gif"
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=140, loop=0, optimize=True)
    print(f"  {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KiB)")


def main() -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    server = ThreadedHTTPServer(("127.0.0.1", 0), NuzzleBridgeHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            try:
                browser = playwright.chromium.launch(headless=True)
            except Exception:
                browser = playwright.chromium.launch(
                    headless=True,
                    executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                )
            print("Screenshots:")
            capture_screens(browser, base)
            print("Pet parade:")
            pet_parade(browser, base)
            print("Tour video:")
            record_tour(browser, base)
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
