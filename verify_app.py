import socket
import threading
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, HTTPServer
from playwright.sync_api import sync_playwright

def is_nuzzle_running(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}", timeout=0.8) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            return "Nuzzle — your agents" in content
    except Exception:
        return False

# Start internal server if not already running
server = None
server_thread = None
PORT = 4173

if not is_nuzzle_running(PORT):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('127.0.0.1', PORT))
        s.close()
    except OSError:
        s.close()
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('127.0.0.1', 0))
        PORT = s.getsockname()[1]
        s.close()
    print(f"Starting internal static server on port {PORT} for testing...")
    server = HTTPServer(('127.0.0.1', PORT), SimpleHTTPRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        errors = []
        missing = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("response", lambda response: missing.append(response.url) if response.status == 404 else None)
        
        print(f"Navigating to Nuzzle local server at http://127.0.0.1:{PORT}...")
        page.goto(f"http://127.0.0.1:{PORT}", wait_until="networkidle")

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
        assert page.locator("#agent-grid .agent-card").count() == 6
        page.locator("#agent-grid .agent-card .toggle").first.click()

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
        page.evaluate("window.nuzzle.dispatchAgentEvent({type: 'error', agent: 'Codex', title: 'Codex failed a test', sub: 'run_command · exit 1'})")
        assert "Codex failed a test" in page.locator("#activity-list .activity-item").first.inner_text()
        assert "state-failed" in page.locator("#hero-pet-art").get_attribute("class")

        # 10. Floating Desktop Overlay & Mini View Verification
        print("Testing Floating Desktop Overlay & Mini Companion...")
        page.get_by_role("button", name="Overview").click()
        assert page.locator("#float-desktop-btn").is_visible()
        assert page.locator("#topbar-float-btn").is_visible()

        mini_page = browser.new_page(viewport={"width": 300, "height": 380})
        mini_page.goto(f"http://127.0.0.1:{PORT}/mini.html", wait_until="networkidle")
        assert mini_page.locator("#mini-art").is_visible()
        assert mini_page.locator("#mini-pat-btn").is_visible()
        mini_page.locator("#mini-pat-btn").click()
        mini_page.wait_for_timeout(200)
        assert "state-pat" in mini_page.locator("#mini-art").get_attribute("class")
        assert mini_page.locator(".toast").count() >= 1
        mini_page.close()

        # 11. Narrow viewport layout verification
        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile.goto(f"http://127.0.0.1:{PORT}", wait_until="networkidle")
        assert mobile.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
        mobile.locator("button[data-view='library']").click()
        mobile.locator("#pet-search").fill("Anya")
        assert mobile.locator("#library-grid .library-card").count() == 1
        mobile.close()

        # Capture visual verification artifact
        screenshot_path = "/tmp/nuzzle-verify.png"
        page.get_by_role("button", name="Overview").click()
        page.screenshot(path=screenshot_path, full_page=True)
        
        print({
            "status": "ALL_TESTS_PASSED",
            "console_errors": errors,
            "missing_404s": missing,
            "screenshot": screenshot_path
        })
        browser.close()
finally:
    if server:
        server.shutdown()
        server.server_close()
