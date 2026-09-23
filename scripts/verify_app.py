import json
import subprocess
import sys
import threading
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

WORKSPACE_DIR = Path(__file__).resolve().parents[1]

subprocess.run([sys.executable, str(WORKSPACE_DIR / "scripts/build_frontend.py")], check=True)
from server import NuzzleBridgeHandler, ThreadedHTTPServer

server = ThreadedHTTPServer(("127.0.0.1", 0), NuzzleBridgeHandler)
PORT = server.server_port
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()

try:
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception as bundled_error:
            chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
            if not chrome.is_file():
                raise bundled_error
            print("Bundled Playwright Chromium unavailable; using installed Google Chrome.")
            browser = p.chromium.launch(headless=True, executable_path=str(chrome))
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        errors = []
        missing = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("response", lambda response: missing.append(response.url) if response.status == 404 else None)
        
        print(f"Navigating to Nuzzle local server at http://127.0.0.1:{PORT}...")
        page.goto(f"http://127.0.0.1:{PORT}", wait_until="domcontentloaded")

        # 1. Title & Header Verification
        assert page.title() == "Nuzzle — your agents, with a little more life"
        assert page.locator("#activity-list .activity-item").count() >= 4
        assert page.locator("#pet-strip .pet-tile").count() == 4
        assert page.locator("#hero-pet-name").inner_text() == "Hu Tao"

        # 2. Interactive Petting & Animation Engine Verification
        print("Testing pet interaction...")
        page.locator("#pet-me-button").click()
        assert "state-pat" in page.locator("#hero-pet-art").get_attribute("class")
        page.wait_for_timeout(300)
        assert page.locator(".toast").count() >= 1

        # 3. Simulate Live Agent Event
        print("Testing agent event simulation...")
        prev_count = page.locator("#activity-list .activity-item").count()
        page.locator("#simulate-event-button").click()
        assert page.locator("#activity-list .activity-item").count() == prev_count + 1

        # 4. Companion Switching from Pet Strip
        print("Testing pet strip selection...")
        page.locator("#pet-strip .pet-tile[data-pet-id='furina']").click()
        assert page.locator("#hero-pet-name").inner_text() == "Furina"

        # 5. Pet Library View, Search & Filtering
        print("Testing Pet Library...")
        page.get_by_role("button", name="Pet library").click()
        assert page.locator("#library-view").is_visible()
        assert page.locator("#library-grid .library-card").count() == 42

        page.locator("#pet-search").fill("Klee")
        assert page.locator("#library-grid .library-card").count() == 1
        
        # Select Klee from library
        page.locator(".library-select-btn").click()
        page.get_by_role("button", name="Overview").click()
        assert page.locator("#hero-pet-name").inner_text() == "Klee"

        # 6. Agents View & Toggles
        print("Testing Agents View...")
        page.get_by_role("button", name="Agents").click()
        assert page.locator("#agent-grid .agent-card").count() == 8
        page.locator("#agent-grid .agent-card .toggle").first.click()

        # V2 atlases retain all v1 state rows and expose 16 cursor-facing cells.
        page.get_by_role("button", name="Overview").click()
        page.evaluate("""
            localStorage.setItem('nuzzle_selected_pet_v1', 'hu-tao');
            const settings = JSON.parse(localStorage.getItem('nuzzle_settings_v1') || '{}');
            settings.launchGreeting = false;
            localStorage.setItem('nuzzle_settings_v1', JSON.stringify(settings));
        """)
        page.reload(wait_until="domcontentloaded")
        hero = page.locator("#hero-pet-art")
        assert page.evaluate("getComputedStyle(document.querySelector('#hero-pet-art')).backgroundSize") == "800% 1100%"
        box = hero.bounding_box()
        page.mouse.move(box["x"] + box["width"], box["y"] + box["height"] / 2)
        assert "is-looking" in hero.get_attribute("class")
        assert hero.evaluate("el => el.style.backgroundPositionY") == "90%"

        # 7. Settings View & Sub-Tabs
        print("Testing Settings Sub-Tabs...")
        page.get_by_role("button", name="Settings").click()
        assert page.locator("#settings-panel-appearance").is_visible()
        
        # Switch to behavior tab
        page.locator(".settings-tab[data-settings-tab='behavior']").click()
        assert page.locator("#settings-panel-behavior").is_visible()

        # Switch to sound tab
        page.locator(".settings-tab[data-settings-tab='sound']").click()
        assert page.locator("#settings-panel-sound").is_visible()

        # Switch to privacy tab
        page.locator(".settings-tab[data-settings-tab='privacy']").click()
        assert page.locator("#settings-panel-privacy").is_visible()

        # 8. Command Palette (⌘ K) & Search
        print("Testing Command Palette...")
        page.keyboard.press("Meta+K")
        assert page.locator("#command-palette.open").count() == 1
        page.locator("#palette-input").fill("Raiden")
        assert page.locator(".palette-item").count() >= 1
        page.keyboard.press("Escape")
        assert page.locator("#command-palette.open").count() == 0

        # 9. Local event bridge verification
        print("Testing local agent event bridge...")
        request = urllib.request.Request(
            f"http://127.0.0.1:{PORT}/events",
            data=json.dumps({
                "type": "error",
                "agent": "Codex",
                "title": "Codex failed a test",
                "sub": "run_command · exit 1",
            }).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=2) as response:
            assert response.status == 200
        page.wait_for_timeout(150)
        assert "Codex failed a test" in page.locator("#activity-list .activity-item").first.inner_text()
        assert "state-failed" in page.locator("#hero-pet-art").get_attribute("class")
        page.evaluate("window.nuzzle.dispatchAgentEvent({type: 'complete', agent: 'Codex'})")
        assert "state-jump" in page.locator("#hero-pet-art").get_attribute("class")

        # Routine progress bubbles are occasional, while important events always surface.
        page.evaluate("document.querySelectorAll('.toast').forEach(node => node.remove())")
        page.evaluate("window.nuzzle.dispatchAgentEvent({type: 'tool', agent: 'RateLimitAgent'})")
        page.evaluate("window.nuzzle.dispatchAgentEvent({type: 'tool', agent: 'RateLimitAgent'})")
        progress_toasts = page.locator(".toast").count()
        assert progress_toasts == 1, f"expected one rate-limited progress toast, got {progress_toasts}"
        page.evaluate("window.nuzzle.dispatchAgentEvent({type: 'complete', agent: 'RateLimitAgent'})")
        important_toasts = page.locator(".toast").count()
        assert important_toasts == 2, f"expected important event to bypass rate limit, got {important_toasts}"

        # Verify every flagship integration drives the same pet lifecycle contract.
        print("Testing supported agent lifecycle responses...")
        for agent in ("Codex", "Antigravity", "OpenCode"):
            page.evaluate("agent => window.nuzzle.dispatchAgentEvent({type: 'tool', agent})", agent)
            assert "state-work" in page.locator("#hero-pet-art").get_attribute("class")
            page.evaluate("agent => window.nuzzle.dispatchAgentEvent({type: 'waiting', agent})", agent)
            assert "state-sleep" in page.locator("#hero-pet-art").get_attribute("class")
            page.evaluate("agent => window.nuzzle.dispatchAgentEvent({type: 'complete', agent})", agent)
            assert "state-jump" in page.locator("#hero-pet-art").get_attribute("class")

        # 10. Floating Desktop Overlay & Mini View Verification
        print("Testing Floating Desktop Overlay & Mini Companion...")
        page.get_by_role("button", name="Overview").click()
        assert page.locator("#float-desktop-btn").is_visible()

        mini_page = browser.new_page(viewport={"width": 300, "height": 380})
        mini_page.goto(f"http://127.0.0.1:{PORT}/mini.html", wait_until="domcontentloaded")
        assert mini_page.locator("#mini-art").is_visible()
        assert mini_page.locator("#mini-menu-trigger").is_visible()
        prior_toasts = mini_page.locator(".toast").count()
        mini_page.locator("#mini-art").click()
        mini_page.wait_for_timeout(200)
        assert "state-pat" in mini_page.locator("#mini-art").get_attribute("class")
        assert mini_page.locator(".toast").count() == prior_toasts + 1
        mini_page.close()

        # 11. Narrow viewport layout verification
        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile.goto(f"http://127.0.0.1:{PORT}", wait_until="domcontentloaded")
        assert mobile.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
        mobile.locator("button[data-view='library']").click()
        mobile.locator("#pet-search").fill("Anya")
        assert mobile.locator("#library-grid .library-card").count() == 1
        mobile.close()

        # Capture visual verification artifact
        screenshot_path = "/tmp/nuzzle-verify.png"
        page.get_by_role("button", name="Overview").click()
        page.screenshot(path=screenshot_path, full_page=True)
        
        assert errors == [], f"Browser console/page errors: {errors}"
        assert missing == [], f"Unexpected HTTP 404 responses: {missing}"
        print({
            "status": "ALL_TESTS_PASSED",
            "console_errors": errors,
            "missing_404s": missing,
            "screenshot": screenshot_path
        })
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    server_thread.join(timeout=2)
