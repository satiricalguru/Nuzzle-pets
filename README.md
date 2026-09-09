<div align="center">

  <img src="https://raw.githubusercontent.com/satiricalguru/Nuzzle-pets/main/public/nuzzle-logo.png" alt="Nuzzle Logo" width="140" />

  # 🐾 Nuzzle — Codex Pets

  <p><strong>A living companion studio for every AI coding agent.</strong></p>
  <p>
    Nuzzle combines the agent-aware interaction model and lifecycle event vocabulary from <a href="https://github.com/ChanceYu/CoPet"><strong>CoPet</strong></a> with the 8×9 / 8×11 Codex-compatible anime & animal pet sprite atlas collection from <a href="https://github.com/chenxin-dlut/codex-anime-pets"><strong>codex-anime-pets</strong></a>.
  </p>

  <p>
    <a href="https://github.com/satiricalguru/Nuzzle-pets/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-coral?style=for-the-badge&color=ef7861" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Desktop-Tauri%202.0-blue?style=for-the-badge&color=24c8db" alt="Tauri 2.0 Desktop" />
    <img src="https://img.shields.io/badge/Pets-42%20Available-orange?style=for-the-badge&color=e58c42" alt="42 Pets Available" />
    <img src="https://img.shields.io/badge/Codex%20v2-16%20Look%20Directions-blue?style=for-the-badge&color=4b8bf5" alt="Codex v2 Look Directions" />
    <img src="https://img.shields.io/badge/Local--First-100%25-green?style=for-the-badge&color=66a76e" alt="Local First" />
    <img src="https://img.shields.io/badge/Dependencies-0%20Runtime-yellow?style=for-the-badge&color=e7bc55" alt="Zero Dependencies" />
  </p>

  <p>
    <a href="#-showcase--previews">Showcase</a> •
    <a href="#-features">Features</a> •
    <a href="#-desktop-companion-modes">Companion Modes</a> •
    <a href="#-supported-agents">Supported Agents</a> •
    <a href="#-built-in-pets-gallery">Built-in Pets</a> •
    <a href="#-anime-companions-collection">Anime Companions</a> •
    <a href="#-codex-v2-atlas-specifications">v2 Atlas Specs</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-contributors--project-credits">Contributors</a> •
    <a href="#-license--disclaimers">License</a>
  </p>

</div>

---

## 🎬 Showcase & Live Animations

<div align="center">
  <img src="assets/nuzzle-hero-animated.gif" alt="Nuzzle Animated Companions Hero" width="840" style="max-width: 100%; border-radius: 14px; margin-bottom: 16px;" />
</div>

<div align="center">
  <img src="assets/nuzzle-actions-animated.gif" alt="Nuzzle Live Animation & Lifecycle States" width="840" style="max-width: 100%; border-radius: 14px; margin-bottom: 16px;" />
</div>

<div align="center">
  <img src="assets/nuzzle-catalog-poster.png" alt="Nuzzle 42 Companions Catalog Poster" width="840" style="max-width: 100%; border-radius: 14px;" />
</div>

---

## ✨ Features

- 🪟 **Codex-Style Desktop Sprite Mode**: Pure transparent, borderless floating companion that stands directly on your macOS desktop without any white card wrappers, borders, or window chrome.
- 🏃 **Direction-Aware Drag-to-Run Physics**: Moving or dragging your companion across the display dynamically triggers directional running animations (Row 1 right / Row 2 left) and smoothly returns to resting idle when stopped.
- ⋯ **Compact Frosted Micro-Dock & Context Menu**: Right-click or tap `⋯` on the micro-dock to open a subtle frosted glass menu for walking/resting, cycling pets, and toggling between Sprite and Widget Card modes.
- ⚡ **Real-Time Agent Reactions**: Companions react instantly to agent prompts, tool execution, thinking/waiting, completions, and error states.
- 👀 **Codex v2 16-Direction Gaze Tracking**: Full 8×11 extended atlas support with 16 clockwise directional look frames (`000°` to `337.5°`).
- 🎨 **Multi-Format Animation Engine**: High-performance CSS sprite-stepping engine rendering continuous animations for idle breathing, pat reactions, energetic work, and resting states.
- ♡ **Interactive Companion Stage**: Click or pat your active companion in the studio to trigger animated reactions, floating particle bursts, and synthesized Web Audio micro-chimes.
- 🔄 **Dynamic Companion Switching**: Switch your featured companion from the Quick Dispatch Strip, Pet Library, or Command Palette with instant cross-view synchronization.
- 📚 **Pet Library & Filtering**: Catalog of 42 companions with instant search and vibe filtering (`all`, `anime`, `cozy`, `chaos`).
- ⌨️ **Command Palette (`⌘ K` / `Ctrl+K`)**: Fast keyboard-driven command palette with live query filtering, number shortcuts (`1`–`4`), arrow key navigation, and quick companion dispatching.
- ⚙️ **Customizable Preferences**: Dedicated settings sub-tabs for **Appearance** (pet scale `S`/`M`/`L`, film grain overlay, animations, floating companion style), **Behavior** (agent messaging, start greeting, float mode), **Sound** (reaction micro-tones, completion alerts), and **Privacy** (100% local-first storage reset).
- 🛡️ **100% Local-First & Zero Cloud**: All state, settings, and favorites are stored locally in your browser/device with zero telemetry, zero tokens leaving your machine, and atomic local writes.

---

## 🪟 Desktop Companion Modes

Nuzzle offers two companion styles to fit your workflow:

| Feature | 🏃 Sprite Mode *(Codex Default)* | 🪟 Widget Card Mode |
| :--- | :--- | :--- |
| **Visual Style** | Pure borderless transparent character sprite | Frosted glass card with stats & borders |
| **Screen Footprint** | Minimal (~220×280px), zero background chrome | Card shell (~300×420px) |
| **Physics & Motion** | Direction-aware running animations on drag | Idle breathing and status state animations |
| **Controls** | Hover micro-dock with `⋯` frosted menu | Integrated button bar |
| **Ideal For** | Coding alongside agents without clutter | Reviewing companion stats and active agent queues |

> **Tip**: Toggle modes anytime by tapping `⋯` on the companion dock, via **Settings → Appearance**, or pressing `⌘ K` in the studio.

---

## 🤖 Supported Agents

Nuzzle bridges lifecycle events across all leading AI coding assistants:

| Agent | Integration Model | Default Config Path |
| :--- | :--- | :--- |
| **Codex** | Native v2 Manifest + Hooks | `~/.codex/pets/`, `~/.codex/hooks.json` |
| **Claude Code** | JSON hooks | `~/.claude/settings.json` |
| **Antigravity** | JSON hooks + Floating overlay | `~/.gemini/config/hooks.json` |
| **Cursor** | JSON hooks | `~/.cursor/hooks.json` |
| **OpenCode** | JS plugin + config entry | `~/.config/opencode/plugins/copet.js` |
| **Copilot CLI** | JSON hook file | `~/.copilot/hooks/copet.json` |
| **Pi** | TypeScript extension | `~/.pi/agent/extensions/copet/index.ts` |
| **Gemini** | JSON hooks | `~/.gemini/settings.json` |

---

## 🐶 Built-in CoPet Mascots & Animals (20 Pets)

Living animated pixel pets from the original CoPet companion collection with full 8×9 animation atlases:

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/copet-neo.gif" width="80" alt="CoPet Neo" /><br /><sub><b>CoPet Neo</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/copet-nia.gif" width="80" alt="CoPet Nia" /><br /><sub><b>CoPet Nia</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/copet-mecha.gif" width="80" alt="CoPet Mecha" /><br /><sub><b>CoPet Mecha</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/dj-fuzz.gif" width="80" alt="DJ Fuzz" /><br /><sub><b>DJ Fuzz</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/dog.gif" width="80" alt="Lucky Dog" /><br /><sub><b>Lucky Dog</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/dragon.gif" width="80" alt="Azure Dragon" /><br /><sub><b>Azure Dragon</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/duck.gif" width="80" alt="Waddly Duck" /><br /><sub><b>Waddly Duck</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/goat.gif" width="80" alt="Cloud Goat" /><br /><sub><b>Cloud Goat</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/goku.gif" width="80" alt="Goku" /><br /><sub><b>Goku</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/horse.gif" width="80" alt="Chestnut Horse" /><br /><sub><b>Chestnut Horse</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/monkey.gif" width="80" alt="Clever Monkey" /><br /><sub><b>Clever Monkey</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/orange-cat.gif" width="80" alt="Orange Cat" /><br /><sub><b>Orange Cat</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/ox.gif" width="80" alt="Cream Ox" /><br /><sub><b>Cream Ox</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/panda.gif" width="80" alt="Panda" /><br /><sub><b>Panda</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/pig.gif" width="80" alt="Blush Pig" /><br /><sub><b>Blush Pig</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/rabbit.gif" width="80" alt="White Rabbit" /><br /><sub><b>White Rabbit</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/rat.gif" width="80" alt="Pearl Rat" /><br /><sub><b>Pearl Rat</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/rooster.gif" width="80" alt="Golden Rooster" /><br /><sub><b>Golden Rooster</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/snake.gif" width="80" alt="Jade Snake" /><br /><sub><b>Jade Snake</b></sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/ChanceYu/CoPet/main/public/pets/tiger.gif" width="80" alt="Striped Tiger" /><br /><sub><b>Striped Tiger</b></sub></td>
  </tr>
</table>

---

## 🌸 Anime Companions Collection (22 Pets)

8×9 / 8×11 sprite atlas anime companions packaged for Codex:

| Companion | Preview | Vibe / Element | Lore & Personality |
| :--- | :---: | :---: | :--- |
| **Hu Tao**<br><sub>`hu-tao`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/hu-tao.png" width="80" alt="Hu Tao" /> | `chaos` · Pyro | *“If there’s work to do, I’ll haunt it.”* · spirited & lively |
| **Furina**<br><sub>`furina`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/furina.png" width="80" alt="Furina" /> | `anime` · Hydro | *“Let the drama of code execution unfold!”* · dramatic flair |
| **Raiden**<br><sub>`raiden`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/raiden.png" width="80" alt="Raiden" /> | `cozy` · Electro | *“Transcendence requires uninterrupted focus.”* · zen master |
| **Ganyu**<br><sub>`ganyu`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/ganyu.png" width="80" alt="Ganyu" /> | `cozy` · Cryo | *“Overtime again? I brought extra tea...”* · gentle companion |
| **Klee**<br><sub>`klee`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/klee.png" width="80" alt="Klee" /> | `chaos` · Pyro | *“Spark Knight Klee reporting for bug hunting!”* · pure energy |
| **Anya**<br><sub>`anya`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/anya.png" width="80" alt="Anya" /> | `anime` · Esper | *“Waku waku! Agent is planning something big!”* · mind reader |
| **Aiko**<br><sub>`aiko`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/aiko.png" width="80" alt="Aiko" /> | `anime` · Anemo | *“Every line of code is a new little adventure.”* · curious explorer |
| **Ayaka**<br><sub>`ayaka`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/ayaka.png" width="80" alt="Ayaka" /> | `cozy` · Cryo | *“May your compilation be swift and graceful.”* · calm precision |
| **Baobao**<br><sub>`baobao`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/baobao.png" width="80" alt="Baobao" /> | `cozy` · Neutral | *“Whatever happens, happens.”* · mystic spirit |
| **Chen**<br><sub>`chen`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/chen.png" width="80" alt="Chen" /> | `chaos` · Sword | *“Duty first. Let's finish this task.”* · sword operator |
| **Conan**<br><sub>`conan`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/conan.png" width="80" alt="Conan" /> | `anime` · Detective | *“There is always only one truth.”* · keen detective |
| **Kid**<br><sub>`kid`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/kid.png" width="80" alt="Kid" /> | `anime` · Magic | *“Ladies and gentlemen, watch this refactor!”* · phantom thief |
| **Lappland**<br><sub>`lappland`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/lappland.png" width="80" alt="Lappland" /> | `chaos` · Wolf | *“Let me at those unit tests!”* · lone wolf |
| **March 7th**<br><sub>`march-7th`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/march-7th.png" width="80" alt="March 7th" /> | `anime` · Cryo | *“Check out this awesome new snapshot!”* · cheerful star |
| **Exusiai**<br><sub>`new-covenant-exusiai`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/new-covenant-exusiai.png" width="80" alt="Exusiai" /> | `chaos` · Light | *“Apple pie! Build succeeded!”* · angel marksman |
| **Phoebe**<br><sub>`phoebe`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/phoebe.png" width="80" alt="Phoebe" /> | `cozy` · Wind | *“Rest easy, the code is in good hands.”* · serene cleric |
| **Regulus**<br><sub>`regulus-star-antimony`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/regulus-star-antimony.png" width="80" alt="Regulus" /> | `chaos` · Rock | *“So you have a pirate radio too?”* · radio DJ arcanist |
| **Shinchan**<br><sub>`shinchan`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/shinchan.png" width="80" alt="Shinchan" /> | `chaos` · Cheeky | *“Hehehe, look at that silly bug!”* · unstoppable prankster |
| **Sonetto**<br><sub>`sonetto`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/sonetto.png" width="80" alt="Sonetto" /> | `cozy` · Light | *“Following protocol, one commit at a time.”* · field agent |
| **Vertin**<br><sub>`vertin`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/vertin.png" width="80" alt="Vertin" /> | `cozy` · Chrono | *“Time flows, but this branch stays.”* · timekeeper |
| **Yoimiya**<br><sub>`yoimiya`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/yoimiya.png" width="80" alt="Yoimiya" /> | `anime` · Pyro | *“Let's light up the night with a clean build!”* · fireworks maker |
| **Zani**<br><sub>`zani`</sub> | <img src="https://raw.githubusercontent.com/chenxin-dlut/codex-anime-pets/main/assets/previews/zani.png" width="80" alt="Zani" /> | `anime` · Electro | *“Power surge — the pipeline is live.”* · dark spark |

---

## 📐 Codex v2 Atlas Specifications

The sprite sheets follow the official Codex v2 11-row extended layout:

- **Dimensions**: `1536 × 2288` pixels (`8 columns × 11 rows`).
- **Cell Size**: `192 × 208` pixels per frame.
- **Manifest**: `spriteVersionNumber: 2`, with 16 look direction angle descriptors.
- **Row Mappings**:
  - **Row 0**: `idle` (6 active frames) — *Gentle breathing and blinking*
  - **Row 1**: `running-right` (8 active frames) — *Moving right*
  - **Row 2**: `running-left` (8 active frames) — *Moving left*
  - **Row 3**: `waving` (4 active frames) — *Head pat & greeting reaction*
  - **Row 4**: `jumping` (5 active frames) — *Excited & happy state*
  - **Row 5**: `failed` (8 active frames) — *Agent error state*
  - **Row 6**: `waiting` (6 active frames) — *Thinking & resting state*
  - **Row 7**: `running` (6 active frames) — *Active tool call / work state*
  - **Row 8**: `review` (6 frames) — *Code review & summary state*
  - **Row 9**: `lookDirections` (`000°` to `157.5°`) — *Gaze angles 0° to 157.5°*
  - **Row 10**: `lookDirections` (`180°` to `337.5°`) — *Gaze angles 180° to 337.5°*

---

## 🚀 Quick Start

### 1. Run the Native Desktop Companion (Tauri 2.0)

For the full macOS floating sprite experience with always-on-top positioning, borderless transparency, and drag-running physics:

```bash
# Install Tauri CLI & dependencies
npm install

# Run in development mode (builds frontend to dist/ and launches native app)
npm run dev

# Build production macOS application bundle (.dmg / .app)
npm run build
```

---

### 2. Run in the Browser (Zero-Install)

Serve the companion studio with any static HTTP server:

```bash
# Using Python 3 built-in HTTP server
python3 -m http.server 4173

# Or with live local agent SSE event bridge:
python3 server.py
```

Then open **[http://localhost:4173](http://localhost:4173)** in your browser.

---

### 3. Install Companions to Native Codex App

Automatically install and configure all 42 anime & CoPet companions directly into your local Codex directory (`~/.codex/pets/`):

```bash
python3 setup_codex.py
```

---

### 4. Run Automated Test & Verification Suites

```bash
# Run end-to-end Playwright UI verification (11 comprehensive test suites)
python3 verify_app.py

# Audit all 42 sprite atlases, row dimensions, and metadata contracts
python3 audit_all_pets.py
```

---

## 👥 Contributors & Project Credits

Nuzzle is built on the shoulders of brilliant open-source creators:

<table>
  <tr>
    <td align="center" width="25%">
      <a href="https://github.com/ChanceYu">
        <img src="https://github.com/ChanceYu.png" width="90" style="border-radius: 50%;" alt="ChanceYu" /><br />
        <sub><b>ChanceYu</b></sub>
      </a><br />
      <small>Creator & Maintainer of <a href="https://github.com/ChanceYu/CoPet">CoPet</a></small>
    </td>
    <td align="center" width="25%">
      <a href="https://github.com/chenxin-dlut">
        <img src="https://github.com/chenxin-dlut.png" width="90" style="border-radius: 50%;" alt="chenxin-dlut" /><br />
        <sub><b>Xin Chen (chenxin-dlut)</b></sub>
      </a><br />
      <small>Creator of <a href="https://github.com/chenxin-dlut/codex-anime-pets">codex-anime-pets</a></small>
    </td>
    <td align="center" width="25%">
      <a href="https://github.com/webbrain-one">
        <img src="https://github.com/webbrain-one.png" width="90" style="border-radius: 50%;" alt="webbrain-one" /><br />
        <sub><b>webbrain-one</b></sub>
      </a><br />
      <small>Contributor to <a href="https://github.com/chenxin-dlut/codex-anime-pets">codex-anime-pets</a></small>
    </td>
    <td align="center" width="25%">
      <a href="https://github.com/satiricalguru">
        <img src="https://github.com/satiricalguru.png" width="90" style="border-radius: 50%;" alt="satiricalguru" /><br />
        <sub><b>Jatin Pandey (satiricalguru)</b></sub>
      </a><br />
      <small>Maintainer of <a href="https://github.com/satiricalguru/Nuzzle-pets">Nuzzle Studio</a></small>
    </td>
  </tr>
</table>

---

## 📄 License & Disclaimers

- **Code & Documentation**: Licensed under the [MIT License](LICENSE) © 2026 Nuzzle Contributors, ChanceYu, and Xin Chen.
- **Pet Sprite Sheet Assets**: The character sprite sheet images in `public/pets/` are fan-made generated art interpretations inspired by anime and game characters. No license is granted to any underlying third-party character, trademark, or franchise. All copyrights and trademarks remain with their respective rights holders. This project is unofficial, non-commercial, and not affiliated with or endorsed by any rights holder.
