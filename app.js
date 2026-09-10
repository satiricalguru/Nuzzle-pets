/**
 * Nuzzle — AI Coding Companion Studio
 * Core Application Logic & State Engine
 */

const TAURI = window.__TAURI__ || null;
const IS_NATIVE_APP = Boolean(TAURI?.core?.invoke);
let nativeEventSequence = 0;
let nativePetRevision = -1;
let nativePollInFlight = false;

async function invokeNative(command, args = {}) {
  if (!IS_NATIVE_APP) throw new Error('This action requires the native Nuzzle app.');
  return TAURI.core.invoke(command, args);
}

// 1. DATA MODELS & CATALOG
const PETS = [
  // ── Anime Companions (Clean transparent WebP sprite atlases) ──────
  {
    id: 'hu-tao',
    name: 'Hu Tao',
    file: 'hu-tao',
    ext: 'webp',
    vibe: 'chaos',
    element: 'pyro',
    note: 'spirited · pyro',
    quote: '“If there’s work to do, I’ll haunt it.”',
    badge: 'currently your favorite',
    favorite: true
  },
  {
    id: 'furina',
    name: 'Furina',
    file: 'furina',
    ext: 'webp',
    vibe: 'anime',
    element: 'hydro',
    note: 'dramatic · hydro',
    quote: '“Let the drama of code execution unfold!”',
    badge: 'dramatic flair',
    favorite: false
  },
  {
    id: 'raiden',
    name: 'Raiden',
    file: 'raiden',
    ext: 'webp',
    vibe: 'cozy',
    element: 'electro',
    note: 'focused · electro',
    quote: '“Transcendence requires uninterrupted focus.”',
    badge: 'zen master',
    favorite: false
  },
  {
    id: 'ganyu',
    name: 'Ganyu',
    file: 'ganyu',
    ext: 'webp',
    vibe: 'cozy',
    element: 'cryo',
    note: 'sleepy · cryo',
    quote: '“Overtime again? I brought extra tea...”',
    badge: 'gentle companion',
    favorite: true
  },
  {
    id: 'klee',
    name: 'Klee',
    file: 'klee',
    ext: 'webp',
    vibe: 'chaos',
    element: 'pyro',
    note: 'tiny · explosive',
    quote: '“Spark Knight Klee reporting for bug hunting!”',
    badge: 'pure energy',
    favorite: false
  },
  {
    id: 'anya',
    name: 'Anya',
    file: 'anya',
    ext: 'webp',
    vibe: 'anime',
    element: 'esper',
    note: 'telepathic · pink',
    quote: '“Waku waku! Agent is planning something big!”',
    badge: 'mind reader',
    favorite: false
  },
  {
    id: 'aiko',
    name: 'Aiko',
    file: 'aiko',
    ext: 'webp',
    vibe: 'anime',
    element: 'anemo',
    note: 'bright · curious',
    quote: '“Every line of code is a new little adventure.”',
    badge: 'curious explorer',
    favorite: false
  },
  {
    id: 'ayaka',
    name: 'Ayaka',
    file: 'ayaka',
    ext: 'webp',
    vibe: 'cozy',
    element: 'cryo',
    note: 'elegant · cryo',
    quote: '“May your compilation be swift and graceful.”',
    badge: 'calm precision',
    favorite: false
  },

  // ── codex-anime-pets (WebP sprite atlases) ─────────────────────────
  {
    id: 'baobao',
    name: 'Baobao',
    file: 'baobao',
    ext: 'webp',
    vibe: 'anime',
    element: 'spirit',
    note: 'mystic · spirit',
    quote: '“Inner strength flows through every keystroke.”',
    badge: 'spirit fighter',
    favorite: false
  },
  {
    id: 'chen',
    name: 'Chen',
    file: 'chen',
    ext: 'webp',
    vibe: 'chaos',
    element: 'blade',
    note: 'sharp · decisive',
    quote: '“Unsheathe the code. Strike clean.”',
    badge: 'sword operator',
    favorite: false
  },
  {
    id: 'conan',
    name: 'Conan',
    file: 'conan',
    ext: 'webp',
    vibe: 'cozy',
    element: 'logic',
    note: 'detective · keen',
    quote: '“There is always only one truth in this stack trace.”',
    badge: 'boy detective',
    favorite: false
  },
  {
    id: 'kid',
    name: 'Kid',
    file: 'kid',
    ext: 'webp',
    vibe: 'chaos',
    element: 'illusion',
    note: 'magician · dashing',
    quote: '“Under the moonlight, I shall refactor this gem.”',
    badge: 'phantom thief',
    favorite: false
  },
  {
    id: 'lappland',
    name: 'Lappland',
    file: 'lappland',
    ext: 'webp',
    vibe: 'chaos',
    element: 'blade',
    note: 'wild · swordswoman',
    quote: '“Silence the warnings, all of them.”',
    badge: 'lone wolf',
    favorite: false
  },
  {
    id: 'march-7th',
    name: 'March 7th',
    file: 'march-7th',
    ext: 'webp',
    vibe: 'anime',
    element: 'cryo',
    note: 'cheerful · cryo',
    quote: '“Smile! I\'m screenshotting this deployment!”',
    badge: 'photo lover',
    favorite: false
  },
  {
    id: 'new-covenant-exusiai',
    name: 'Exusiai',
    file: 'new-covenant-exusiai',
    ext: 'webp',
    vibe: 'chaos',
    element: 'light',
    note: 'angelic · gunner',
    quote: '“Apple pie and rapid-fire commits!”',
    badge: 'angel marksman',
    favorite: false
  },
  {
    id: 'phoebe',
    name: 'Phoebe',
    file: 'phoebe',
    ext: 'webp',
    vibe: 'cozy',
    element: 'anemo',
    note: 'gentle · acolyte',
    quote: '“May the winds guide your merge conflicts.”',
    badge: 'serene cleric',
    favorite: false
  },
  {
    id: 'regulus-star-antimony',
    name: 'Regulus',
    file: 'regulus-star-antimony',
    ext: 'webp',
    vibe: 'chaos',
    element: 'electro',
    note: 'radio · arcanist',
    quote: '“Broadcasting on all frequencies — ship it!”',
    badge: 'radio DJ',
    favorite: false
  },
  {
    id: 'shinchan',
    name: 'Shinchan',
    file: 'shinchan',
    ext: 'webp',
    vibe: 'chaos',
    element: 'mischief',
    note: 'cheeky · unstoppable',
    quote: '“Action Mask says: never skip code review!”',
    badge: 'crayon chaos',
    favorite: false
  },
  {
    id: 'sonetto',
    name: 'Sonetto',
    file: 'sonetto',
    ext: 'webp',
    vibe: 'cozy',
    element: 'light',
    note: 'dutiful · composed',
    quote: '“Following protocol, one commit at a time.”',
    badge: 'field agent',
    favorite: false
  },
  {
    id: 'vertin',
    name: 'Vertin',
    file: 'vertin',
    ext: 'webp',
    vibe: 'cozy',
    element: 'chrono',
    note: 'timeless · wise',
    quote: '“Time flows, but this branch stays.”',
    badge: 'timekeeper',
    favorite: false
  },
  {
    id: 'yoimiya',
    name: 'Yoimiya',
    file: 'yoimiya',
    ext: 'webp',
    vibe: 'anime',
    element: 'pyro',
    note: 'fireworks · bright',
    quote: '“Let\'s light up the night with a clean build!”',
    badge: 'firework queen',
    favorite: false
  },
  {
    id: 'zani',
    name: 'Zani',
    file: 'zani',
    ext: 'webp',
    vibe: 'anime',
    element: 'electro',
    note: 'horned · intense',
    quote: '“Power surge — the pipeline is live.”',
    badge: 'dark spark',
    favorite: false
  },

  // ── CoPet Animal & Mascot Companions (Full WebP sprite atlases) ──
  {
    id: 'copet-neo',
    name: 'CoPet Neo',
    file: 'copet-neo',
    ext: 'webp',
    vibe: 'anime',
    element: 'digital',
    note: 'original · mascot',
    quote: '“I\'m the OG coding companion.”',
    badge: 'CoPet classic',
    favorite: false
  },
  {
    id: 'copet-nia',
    name: 'CoPet Nia',
    file: 'copet-nia',
    ext: 'webp',
    vibe: 'cozy',
    element: 'digital',
    note: 'sweet · soft',
    quote: '“Everything will compile just fine, I promise.”',
    badge: 'gentle soul',
    favorite: false
  },
  {
    id: 'copet-mecha',
    name: 'CoPet Mecha',
    file: 'copet-mecha',
    ext: 'webp',
    vibe: 'chaos',
    element: 'mecha',
    note: 'armored · fierce',
    quote: '“Initiating build sequence. Full power.”',
    badge: 'mech warrior',
    favorite: false
  },
  {
    id: 'dj-fuzz',
    name: 'DJ Fuzz',
    file: 'dj-fuzz',
    ext: 'webp',
    vibe: 'chaos',
    element: 'music',
    note: 'beats · funky',
    quote: '“Drop the bass... and the database migration.”',
    badge: 'party starter',
    favorite: false
  },
  {
    id: 'dog',
    name: 'Lucky Dog',
    file: 'dog',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'loyal · warm',
    quote: '“Fetching your results... good boy style!”',
    badge: 'best friend',
    favorite: false
  },
  {
    id: 'dragon',
    name: 'Azure Dragon',
    file: 'dragon',
    ext: 'webp',
    vibe: 'chaos',
    element: 'pyro',
    note: 'ancient · majestic',
    quote: '“Breathe fire into that CI pipeline.”',
    badge: 'mythic beast',
    favorite: false
  },
  {
    id: 'duck',
    name: 'Waddly Duck',
    file: 'duck',
    ext: 'webp',
    vibe: 'cozy',
    element: 'hydro',
    note: 'rubber · quacky',
    quote: '“Rubber duck debugging, at your service.”',
    badge: 'debug buddy',
    favorite: false
  },
  {
    id: 'goat',
    name: 'Cloud Goat',
    file: 'goat',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'fluffy · stubborn',
    quote: '“I eat bugs for breakfast. Literally.”',
    badge: 'mountain dweller',
    favorite: false
  },
  {
    id: 'goku',
    name: 'Goku',
    file: 'goku',
    ext: 'webp',
    vibe: 'chaos',
    element: 'spirit',
    note: 'legendary · powerful',
    quote: '“Kamehameha! Deploying to production!”',
    badge: 'super saiyan',
    favorite: false
  },
  {
    id: 'horse',
    name: 'Chestnut Horse',
    file: 'horse',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'galloping · swift',
    quote: '“Racing through your backlog at full gallop.”',
    badge: 'swift runner',
    favorite: false
  },
  {
    id: 'monkey',
    name: 'Clever Monkey',
    file: 'monkey',
    ext: 'webp',
    vibe: 'chaos',
    element: 'spirit',
    note: 'cheeky · clever',
    quote: '“Who said monkey-patching is bad practice?”',
    badge: 'code trickster',
    favorite: false
  },
  {
    id: 'orange-cat',
    name: 'Orange Cat',
    file: 'orange-cat',
    ext: 'webp',
    vibe: 'cozy',
    element: 'anemo',
    note: 'lazy · purring',
    quote: '“I\'ll review this PR after my nap... maybe.”',
    badge: 'keyboard napper',
    favorite: false
  },
  {
    id: 'ox',
    name: 'Cream Ox',
    file: 'ox',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'sturdy · reliable',
    quote: '“Steady progress. No shortcuts.”',
    badge: 'workhorse',
    favorite: false
  },
  {
    id: 'panda',
    name: 'Panda',
    file: 'panda',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'cuddly · zen',
    quote: '“Bamboo break, then back to coding.”',
    badge: 'zen coder',
    favorite: false
  },
  {
    id: 'pig',
    name: 'Blush Pig',
    file: 'pig',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'round · happy',
    quote: '“Oink! That test passed on the first try!”',
    badge: 'happy trotter',
    favorite: false
  },
  {
    id: 'rabbit',
    name: 'White Rabbit',
    file: 'rabbit',
    ext: 'webp',
    vibe: 'cozy',
    element: 'cryo',
    note: 'fluffy · quick',
    quote: '“Hop hop! Let me jump through these tests.”',
    badge: 'speed hopper',
    favorite: false
  },
  {
    id: 'rat',
    name: 'Pearl Rat',
    file: 'rat',
    ext: 'webp',
    vibe: 'cozy',
    element: 'earth',
    note: 'clever · small',
    quote: '“Small but mighty. Watch me find that bug.”',
    badge: 'tiny explorer',
    favorite: false
  },
  {
    id: 'rooster',
    name: 'Golden Rooster',
    file: 'rooster',
    ext: 'webp',
    vibe: 'chaos',
    element: 'pyro',
    note: 'bold · loud',
    quote: '“Cock-a-doodle-DEPLOY!”',
    badge: 'dawn caller',
    favorite: false
  },
  {
    id: 'snake',
    name: 'Jade Snake',
    file: 'snake',
    ext: 'webp',
    vibe: 'anime',
    element: 'cryo',
    note: 'sly · elegant',
    quote: '“Ssslithering through your Python code.”',
    badge: 'code serpent',
    favorite: false
  },
  {
    id: 'tiger',
    name: 'Fierce Tiger',
    file: 'tiger',
    ext: 'webp',
    vibe: 'chaos',
    element: 'pyro',
    note: 'powerful · striped',
    quote: '“Pouncing on regressions with ferocity.”',
    badge: 'apex hunter',
    favorite: false
  }
];

const INITIAL_AGENTS = [
  { id: 'codex', name: 'Codex', key: 'codex', mark: 'C', desc: 'Prompt, tool, approval, completion, and error hooks.', active: false, available: true },
  { id: 'claude-code', name: 'Claude Code', key: 'claude', mark: '✦', desc: 'Lifecycle hooks through Claude Code settings.', active: false, available: true },
  { id: 'cursor', name: 'Cursor', key: 'cursor', mark: '⌁', desc: 'Cursor Agent prompt and tool lifecycle hooks.', active: false, available: true },
  { id: 'antigravity', name: 'Antigravity', key: 'antigravity', mark: '↗', desc: 'Antigravity invocation and tool lifecycle hooks.', active: false, available: true },
  { id: 'gemini', name: 'Gemini', key: 'gemini', mark: '✧', desc: 'Multimodal prompt and response hooks.', active: false, available: true },
  { id: 'opencode', name: 'OpenCode', key: 'opencode', mark: '◎', desc: 'A local OpenCode plugin forwards lifecycle events.', active: false, available: true }
];

const SAMPLE_EVENTS = [
  { icon: '✦', type: 'working', title: 'Codex is refactoring styles.css', sub: 'tool call · write_file', time: 'now' },
  { icon: '✓', type: 'done', title: 'Claude Code finished a review', sub: '12 files · 4m ago', time: '04m' },
  { icon: '◌', type: 'wait', title: 'Cursor is thinking', sub: 'waiting for response', time: '07m' },
  { icon: '✓', type: 'done', title: 'Gemini completed a summary', sub: 'task complete · 11m ago', time: '11m' },
  { icon: '↗', type: 'working', title: 'Antigravity planned agent roadmap', sub: 'workflow · execute_plan', time: '14m' }
];

// 2. STATE STORE & LOCALSTORAGE PERSISTENCE
const STORAGE_KEYS = {
  SETTINGS: 'nuzzle_settings_v1',
  FAVORITES: 'nuzzle_favorites_v1',
  SELECTED_PET: 'nuzzle_selected_pet_v1',
  AGENTS: 'nuzzle_agents_v1'
};

function loadStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

const state = {
  selectedPetId: loadStored(STORAGE_KEYS.SELECTED_PET, 'hu-tao'),
  favorites: new Set(loadStored(STORAGE_KEYS.FAVORITES, ['hu-tao', 'ganyu'])),
  settings: loadStored(STORAGE_KEYS.SETTINGS, {
    petSize: 'm',
    noise: true,
    animation: true,
    showMessages: true,
    launchGreeting: true,
    keepOnTop: true,
    petSounds: true,
    completionSounds: false,
    companionMode: loadStored('nuzzle_companion_mode', 'sprite')
  }),
  agents: INITIAL_AGENTS.map(agent => ({ ...agent })),
  activity: [...SAMPLE_EVENTS],
  currentView: 'overview',
  currentSettingsTab: 'appearance',
  activePetState: 'idle',
  paletteIndex: 0
};

// 3. SYNTHETIC AUDIO ENGINE (Web Audio API for gentle micro-chimes)
let audioCtx = null;
function playChime(type = 'pat') {
  if (type === 'completion') {
    if (!state.settings.completionSounds) return;
  } else {
    if (!state.settings.petSounds) return;
  }

  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    
    if (type === 'pat') {
      // Happy two-tone chime (E5 -> A5)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'pop') {
      // Subtle toggle tick
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'completion' || type === 'bell') {
      // Gentle ascending triad (C5: 523.25 -> E5: 659.25 -> G5: 783.99)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        const start = now + idx * 0.11;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.06, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(start);
        o.stop(start + 0.33);
      });
    }
  } catch (e) {
    // Audio Context not permitted without prior user gesture
  }
}

// 4. DOM HELPERS
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function petUrl(pet) {
  const ext = (typeof pet === 'object' ? pet.ext : 'png') || 'png';
  const file = typeof pet === 'object' ? pet.file : pet;
  return `/pets/${file}.${ext}`;
}

function artStyle(petOrFile) {
  return `background-image:url('${petUrl(petOrFile)}')`;
}

// 5. PET SPRITE ANIMATION & INTERACTION ENGINE
let petStateTimeout = null;

function setPetState(newState, durationMs = 2000) {
  state.activePetState = newState;
  const activePet = PETS.find(p => p.id === state.selectedPetId) || PETS[0];
  const gifClass = activePet.ext === 'gif' ? ' gif-pet' : '';

  const arts = $$('.pet-art, .mini-art, .pip-art');
  arts.forEach(art => {
    const isMini = art.classList.contains('mini-art');
    const isPip = art.classList.contains('pip-art');
    art.className = `${isMini ? 'mini-art ' : isPip ? 'pip-art ' : 'pet-art '}state-${newState}${gifClass}`;
  });

  const stateTag = $('#hero-pet-state-tag');
  if (stateTag) stateTag.textContent = `${newState} state`;

  const miniStateText = $('#mini-state-text');
  if (miniStateText) miniStateText.textContent = `${newState} state`;

  if (petStateTimeout) clearTimeout(petStateTimeout);
  if (newState !== 'idle') {
    petStateTimeout = setTimeout(() => {
      const activePet2 = PETS.find(p => p.id === state.selectedPetId) || PETS[0];
      const gifClass2 = activePet2.ext === 'gif' ? ' gif-pet' : '';
      $$('.pet-art, .mini-art, .pip-art').forEach(art => {
        const isMini = art.classList.contains('mini-art');
        const isPip = art.classList.contains('pip-art');
        art.className = `${isMini ? 'mini-art ' : isPip ? 'pip-art ' : 'pet-art '}state-idle${gifClass2}`;
      });
      state.activePetState = 'idle';
      if (stateTag) stateTag.textContent = 'idle state';
      if (miniStateText) miniStateText.textContent = 'idle state';
      updatePipWindow();
    }, durationMs);
  }
  updatePipWindow();
}

let pipWindowInstance = null;

function updatePipWindow() {
  if (!pipWindowInstance || pipWindowInstance.closed) {
    pipWindowInstance = null;
    return;
  }
  try {
    const pet = PETS.find(p => p.id === state.selectedPetId) || PETS[0];
    const art = pipWindowInstance.document.getElementById('pip-art');
    const name = pipWindowInstance.document.getElementById('pip-name');
    const quote = pipWindowInstance.document.getElementById('pip-quote');

    if (art) {
      art.style.backgroundImage = `url('${petUrl(pet)}')`;
      const gifClass = pet.ext === 'gif' ? ' gif-pet' : '';
      art.className = `pip-art state-${state.activePetState || 'idle'}${gifClass}`;
    }
    if (name) name.textContent = pet.name;
    if (quote) quote.textContent = pet.quote;
  } catch (err) {
    console.warn('PiP update error:', err);
  }
}

async function floatPetOnDesktop() {
  if (IS_NATIVE_APP) {
    try {
      await invokeNative('show_companion');
      showToast('Your companion is floating above your apps.');
    } catch (error) {
      showToast(`Could not show companion: ${error}`);
    }
    return;
  }

  if (pipWindowInstance && !pipWindowInstance.closed) {
    pipWindowInstance.focus();
    showToast('Companion is already floating on your desktop!');
    return;
  }

  if ('documentPictureInPicture' in window) {
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 240,
        height: 280
      });
      pipWindowInstance = pip;

      [...document.styleSheets].forEach(styleSheet => {
        try {
          if (styleSheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pip.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = document.createElement('style');
            [...styleSheet.cssRules].forEach(rule => {
              style.appendChild(document.createTextNode(rule.cssText));
            });
            pip.document.head.appendChild(style);
          }
        } catch (e) {}
      });

      const pipStyle = document.createElement('style');
      pipStyle.textContent = `
        @keyframes pet-frames-4 { from { background-position-x: 0%; } to { background-position-x: 57.143%; } }
        @keyframes pet-frames-6 { from { background-position-x: 0%; } to { background-position-x: 85.714%; } }
        @keyframes pet-frames-8 { from { background-position-x: 0%; } to { background-position-x: 114.286%; } }
        @keyframes pet-float-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pet-pat-bounce {
          0% { transform: scale(1) translateY(0); }
          25% { transform: scale(1.12, 0.9) translateY(4px); }
          50% { transform: scale(0.95, 1.1) translateY(-10px); }
          75% { transform: scale(1.05, 0.95) translateY(-2px); }
          100% { transform: scale(1) translateY(0); }
        }
        body {
          margin: 0;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fcfbf8;
          overflow: hidden;
          user-select: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .pip-card {
          width: 100%;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 12px 10px;
          text-align: center;
          box-shadow: 0 8px 24px rgba(77,47,30,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          position: relative;
        }
        .pip-art {
          width: 110px;
          height: 125px;
          background-color: #f2ede5;
          background-repeat: no-repeat;
          background-size: 800% 900%;
          border-radius: 45% 45% 39% 39%;
          box-shadow: 0 8px 16px rgba(77,47,30,0.1);
          cursor: pointer;
          transition: transform 0.15s ease;
          animation: pet-frames-6 1.2s steps(6) infinite, pet-float-gentle 3.6s ease-in-out infinite;
        }
        .pip-art:hover { transform: scale(1.05); }
        .pip-art:active { transform: scale(0.95); }
        .pip-art.state-idle {
          background-position-y: 1.5%;
          animation: pet-frames-6 1.2s steps(6) infinite, pet-float-gentle 3.6s ease-in-out infinite;
        }
        .pip-art.state-pat {
          background-position-y: 38.5%;
          animation: pet-frames-4 0.7s steps(4) 3, pet-pat-bounce 0.6s cubic-bezier(.34, 1.56, .64, 1) 1;
        }
        .pip-art.state-work {
          background-position-y: 88.5%;
          animation: pet-frames-6 0.75s steps(6) infinite, pet-float-gentle 2s ease-in-out infinite;
        }
        .pip-art.state-sleep {
          background-position-y: 75.5%;
          animation: pet-frames-6 1.8s steps(6) infinite, pet-float-gentle 5s ease-in-out infinite;
        }
        .pip-art.state-failed {
          background-position-y: 63.5%;
          animation: pet-frames-8 1s steps(8) infinite, pet-float-gentle 2.4s ease-in-out infinite;
        }
        .pip-art.state-review {
          background-position-y: 100%;
          animation: pet-frames-6 1s steps(6) infinite, pet-float-gentle 3s ease-in-out infinite;
        }
        .pip-art.gif-pet {
          background-size: contain !important;
          background-position: center center !important;
          animation: pet-float-gentle 3.6s ease-in-out infinite !important;
        }
        .pip-art.gif-pet.state-pat {
          animation: pet-pat-bounce 0.6s cubic-bezier(.34, 1.56, .64, 1) 1, pet-float-gentle 3.6s ease-in-out infinite !important;
        }
        .pip-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px;
          font-weight: 700;
          color: #1f1d1a;
          margin: 2px 0 0;
        }
        .pip-quote {
          font-size: 10px;
          font-style: italic;
          color: #7c7267;
          margin: 0 0 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
        .pip-btn-row {
          display: flex;
          gap: 6px;
          margin-top: 2px;
        }
        .pip-pat-btn {
          background: #ea5a47;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .pip-pat-btn:hover { background: #d94936; }
        .pip-cycle-btn {
          background: #f0eae2;
          color: #1f1d1a;
          border: none;
          border-radius: 10px;
          padding: 5px 8px;
          font-size: 11px;
          cursor: pointer;
        }
        .pip-cycle-btn:hover { background: #e5dec5; }
      `;
      pip.document.head.appendChild(pipStyle);

      const pet = PETS.find(p => p.id === state.selectedPetId) || PETS[0];
      pip.document.body.innerHTML = `
        <div class="pip-card" id="pip-card">
          <div class="pet-particles" id="pip-particles"></div>
          <div class="pip-art state-${state.activePetState || 'idle'}${pet.ext === 'gif' ? ' gif-pet' : ''}" id="pip-art" style="${artStyle(pet)}" title="Click to pat!"></div>
          <strong class="pip-name" id="pip-name">${pet.name}</strong>
          <small class="pip-quote" id="pip-quote">${pet.quote}</small>
          <div class="pip-btn-row">
            <button class="pip-pat-btn" id="pip-pat-btn">♡ pat</button>
            <button class="pip-cycle-btn" id="pip-cycle-btn" title="Next Companion">next ↻</button>
          </div>
        </div>
      `;

      const art = pip.document.getElementById('pip-art');
      const patBtn = pip.document.getElementById('pip-pat-btn');
      const cycleBtn = pip.document.getElementById('pip-cycle-btn');

      if (art) art.addEventListener('click', () => patActivePet());
      if (patBtn) patBtn.addEventListener('click', () => patActivePet());
      if (cycleBtn) {
        cycleBtn.addEventListener('click', () => {
          const idx = PETS.findIndex(p => p.id === state.selectedPetId);
          const nextIdx = (idx + 1) % PETS.length;
          selectCompanion(PETS[nextIdx].id);
        });
      }

      pip.addEventListener('pagehide', () => {
        pipWindowInstance = null;
      });

      showToast(`Floating ${pet.name} on desktop! (Always On Top)`);
      return;
    } catch (err) {
      console.warn('Document Picture-in-Picture error, falling back to popup window:', err);
    }
  }

  const popup = window.open('/mini.html', 'NuzzleFloatingCompanion', 'width=280,height=360,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no');
  if (popup) {
    showToast('Opened mini floating companion window!');
  } else {
    showToast('Pop-up blocked. Please allow pop-ups for localhost.');
  }
}

function createHeartBurst(event) {
  const container = $('#pet-particles') || $('#mini-particles') || (pipWindowInstance && !pipWindowInstance.closed ? pipWindowInstance.document.getElementById('pip-particles') : null);
  if (!container) return;
  
  const hearts = ['♡', '♥', '✦', '✧'];
  for (let i = 0; i < 5; i++) {
    const heart = document.createElement('span');
    heart.className = 'burst-heart';
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    const dx = (Math.random() * 80 - 40) + 'px';
    heart.style.setProperty('--dx', dx);
    heart.style.left = (35 + Math.random() * 30) + '%';
    heart.style.top = (40 + Math.random() * 20) + '%';
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 1200);
  }
}

function patActivePet() {
  const activePet = PETS.find(p => p.id === state.selectedPetId) || PETS[0];
  setPetState('pat', 2200);
  createHeartBurst();
  playChime('pat');

  const btn = $('#pet-me-button');
  if (btn) {
    btn.textContent = `♡ ${activePet.name} is blushing`;
    setTimeout(() => { btn.textContent = '♡ pet companion'; }, 2200);
  }
  showToast(`${activePet.name} received a warm head pat!`);
}

// 6. COMPANION SELECTION & SYNCHRONIZATION
function selectCompanion(petId) {
  const pet = PETS.find(p => p.id === petId);
  if (!pet) return;

  state.selectedPetId = petId;
  saveStored(STORAGE_KEYS.SELECTED_PET, petId);
  if (IS_NATIVE_APP) {
    invokeNative('select_native_pet', { id: petId }).catch(error => {
      console.warn('Unable to persist native pet selection:', error);
    });
  }
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('nuzzle-pet-selection');
    channel.postMessage({ petId });
    channel.close();
  }

  renderFeaturedPet();
  renderPetStrip();
  const activeFilter = $('.filter-button.active')?.dataset.filter || 'all';
  renderLibrary(activeFilter, $('#pet-search')?.value || '');
  setPetState('pat', 1500);
  createHeartBurst();
  playChime('pat');
  updatePipWindow();
  showToast(`${pet.name} is now your active companion`);
}

function toggleFavorite(petId) {
  if (state.favorites.has(petId)) {
    state.favorites.delete(petId);
    showToast(`Removed from favorites`);
  } else {
    state.favorites.add(petId);
    playChime('pat');
    showToast(`Added to favorites`);
  }
  saveStored(STORAGE_KEYS.FAVORITES, [...state.favorites]);

  renderFeaturedPet();
  renderPetStrip();
  const filter = $('.filter-button.active')?.dataset.filter || 'all';
  renderLibrary(filter, $('#pet-search')?.value || '');
}

// 7. RENDER FUNCTIONS
function renderFeaturedPet() {
  const pet = PETS.find(p => p.id === state.selectedPetId) || PETS[0];
  const heroArt = $('#hero-pet-art');
  const heroName = $('#hero-pet-name');
  const heroQuote = $('#hero-pet-quote');
  const heroBadge = $('#hero-pet-badge');
  const heroVibe = $('#hero-pet-vibe');

  if (heroArt) {
    heroArt.style.backgroundImage = `url('${petUrl(pet)}')`;
    heroArt.setAttribute('aria-label', `${pet.name} companion sprite`);
    heroArt.classList.toggle('gif-pet', pet.ext === 'gif');
  }
  if (heroName) heroName.textContent = pet.name;
  if (heroQuote) heroQuote.textContent = pet.quote;
  if (heroBadge) {
    heroBadge.innerHTML = `<span class="mini-spark">✦</span> ${state.favorites.has(pet.id) ? 'currently your favorite' : pet.badge}`;
  }
  if (heroVibe) heroVibe.textContent = `${pet.vibe} · ${pet.element}`;
}

function renderPetStrip() {
  const strip = $('#pet-strip');
  if (!strip) return;

  // Show 4 pets (prioritize selected and favorites)
  const displayPets = PETS.slice(0, 4);
  strip.innerHTML = displayPets.map(pet => {
    const isSelected = pet.id === state.selectedPetId;
    const isFav = state.favorites.has(pet.id);
    return `
      <div class="pet-tile ${isSelected ? 'selected' : ''}" data-pet-id="${pet.id}" role="listitem" tabindex="0">
        <div class="pet-tile-art${pet.ext === 'gif' ? ' gif-pet' : ''}" style="${artStyle(pet)}"></div>
        <div class="pet-tile-copy">
          <strong>${pet.name}</strong>
          <small>${pet.note}</small>
        </div>
        <button class="pet-tile-fav ${isFav ? 'active' : ''}" data-fav-id="${pet.id}" aria-label="Favorite ${pet.name}" title="Favorite ${pet.name}">♥</button>
      </div>
    `;
  }).join('');
}

function renderLibrary(filter = 'all', search = '') {
  const grid = $('#library-grid');
  if (!grid) return;

  const query = search.trim().toLowerCase();
  const visible = PETS.filter(pet => {
    const matchesFilter = (filter === 'all' || pet.vibe === filter);
    const matchesSearch = !query || `${pet.name} ${pet.note} ${pet.quote} ${pet.element}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const countDisplay = $('#library-count-display');
  if (countDisplay) countDisplay.textContent = visible.length;

  if (!visible.length) {
    grid.innerHTML = '<div class="empty-state">No tiny companions found matching your criteria. Try another search.</div>';
    return;
  }

  grid.innerHTML = visible.map(pet => {
    const isActive = pet.id === state.selectedPetId;
    const isFav = state.favorites.has(pet.id);
    return `
      <article class="library-card ${isActive ? 'is-active-companion' : ''}" data-pet-id="${pet.id}">
        <div class="library-art-stage" data-action="select-companion" data-pet-id="${pet.id}" title="Click to make ${pet.name} your companion">
          <div class="library-art${pet.ext === 'gif' ? ' gif-pet' : ''}" style="${artStyle(pet)}"></div>
        </div>
        <div class="library-info">
          <div>
            <strong>${pet.name}</strong>
            <small>${pet.note}</small>
          </div>
          <button class="library-heart ${isFav ? 'active' : ''}" data-fav-id="${pet.id}" aria-label="Favorite ${pet.name}" title="Favorite ${pet.name}">♥</button>
        </div>
        <div class="library-card-actions">
          <button class="library-select-btn" data-action="select-companion" data-pet-id="${pet.id}">
            ${isActive ? '✓ Active companion' : 'Set as companion'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function renderAgents() {
  const grid = $('#agent-grid');
  if (!grid) return;

  grid.innerHTML = state.agents.map(agent => `
    <article class="agent-card">
      <div class="agent-card-top">
        <div class="agent-logo ${agent.key}">${agent.mark}</div>
        <button class="toggle ${agent.active ? 'on' : ''}" data-agent-toggle="${agent.id}" aria-label="${agent.active ? 'Disconnect' : 'Connect'} ${agent.name}" ${!agent.available && !agent.active ? 'disabled' : ''}>
          <span></span>
        </button>
      </div>
      <h3>${agent.name}</h3>
      <p>${agent.desc}</p>
      <div class="agent-card-foot">
        <span><i class="${agent.healthy ? 'green-dot' : 'status-dot-muted'}"></i> ${agent.active ? 'connected' : agent.available ? 'detected' : 'not detected'}</span>
        <button data-action="configure-agent" data-agent-id="${agent.id}" ${!agent.available && !agent.active ? 'disabled' : ''}>${agent.active ? 'disconnect' : 'connect'} ↗</button>
      </div>
      <small class="agent-health-message">${agent.message || 'Checking native integration…'}</small>
    </article>
  `).join('');

  const activeCount = state.agents.filter(a => a.active).length;
  const totalCount = state.agents.length;
  const navCount = $('#nav-agent-count');
  const orbitCount = $('#orbit-count');
  const activeAgentsNum = $('#active-agents-num');

  if (navCount) navCount.textContent = `${activeCount}/${totalCount}`;
  if (orbitCount) orbitCount.textContent = activeCount;
  if (activeAgentsNum) activeAgentsNum.textContent = activeCount;
}

function renderActivity() {
  const list = $('#activity-list');
  if (!list) return;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  list.innerHTML = state.activity.map(item => `
    <div class="activity-item">
      <div class="activity-icon ${escapeHtml(item.type)}">${escapeHtml(item.icon)}</div>
      <div class="activity-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.sub)}</small>
      </div>
      <span class="activity-time">${escapeHtml(item.time)}</span>
    </div>
  `).join('');
}

// 8. COMMAND PALETTE SEARCH & NAVIGATION
const PALETTE_ACTIONS = [
  { id: 'view-overview', category: 'Navigation', title: 'Go to Overview', icon: '⌂', shortcut: '1', action: () => setView('overview') },
  { id: 'view-library', category: 'Navigation', title: 'Browse Pet Library', icon: '✣', shortcut: '2', action: () => setView('library') },
  { id: 'view-agents', category: 'Navigation', title: 'Manage Agents & Integrations', icon: '⌘', shortcut: '3', action: () => setView('agents') },
  { id: 'view-settings', category: 'Navigation', title: 'Open Settings & Preferences', icon: '◌', shortcut: '4', action: () => setView('settings') },
  { id: 'act-float', category: 'Desktop', title: 'Float Companion on Desktop (Always on Top)', icon: '❐', shortcut: 'F', action: () => floatPetOnDesktop() },
  { id: 'act-toggle-mode', category: 'Desktop', title: 'Toggle Desktop Sprite / Card Mode (Codex Style)', icon: '👻', shortcut: 'M', action: () => toggleCompanionMode() },
  { id: 'act-codex-setup', category: 'Codex Integration', title: 'Auto-Set 42 Companions in Codex (~/.codex/pets)', icon: '⌘', shortcut: 'C', action: () => autoSetCodex() },
  { id: 'act-pat', category: 'Pet Actions', title: 'Pet Active Companion', icon: '♡', action: () => patActivePet() },
  { id: 'act-sim', category: 'Agent Actions', title: 'Simulate Agent Tool Call', icon: '⚡︎', action: () => simulateAgentEvent() },
  ...PETS.map(p => ({ id: `pet-${p.id}`, category: 'Switch Companion', title: `Switch Companion to ${p.name}`, icon: '✦', action: () => selectCompanion(p.id) }))
];

function renderCommandPalette(query = '') {
  const container = $('#palette-results');
  if (!container) return;

  const q = query.trim().toLowerCase();
  const filtered = PALETTE_ACTIONS.filter(item => !q || (item.title + ' ' + item.category).toLowerCase().includes(q));

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;">No matching commands</div>';
    return;
  }

  state.paletteIndex = Math.min(state.paletteIndex, filtered.length - 1);
  if (state.paletteIndex < 0) state.paletteIndex = 0;

  container.innerHTML = filtered.map((item, index) => `
    <button class="palette-item ${index === state.paletteIndex ? 'highlighted' : ''}" data-palette-id="${item.id}">
      <span class="palette-icon">${item.icon}</span>
      <span>${item.title}</span>
      ${item.shortcut ? `<kbd>${item.shortcut}</kbd>` : ''}
    </button>
  `).join('');
}

function openPalette(open = true) {
  const palette = $('#command-palette');
  const input = $('#palette-input');
  if (!palette) return;

  palette.classList.toggle('open', open);
  palette.setAttribute('aria-hidden', String(!open));

  if (open) {
    state.paletteIndex = 0;
    if (input) {
      input.value = '';
      renderCommandPalette('');
      setTimeout(() => input.focus(), 50);
    }
  }
}

function executePaletteItem(index) {
  const q = $('#palette-input')?.value.trim().toLowerCase() || '';
  const filtered = PALETTE_ACTIONS.filter(item => !q || (item.title + ' ' + item.category).toLowerCase().includes(q));
  const target = filtered[index];
  if (target && target.action) {
    openPalette(false);
    target.action();
  }
}

// 9. TOAST NOTIFICATION SYSTEM
function showToast(message) {
  const region = $('.toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = document.createElement('span');
  icon.textContent = '✦';
  const text = document.createElement('span');
  text.textContent = String(message ?? '');
  toast.appendChild(icon);
  toast.appendChild(text);
  region.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade');
    setTimeout(() => toast.remove(), 300);
  }, 2300);
}

// 10. NAVIGATION & VIEW CONTROLLER
function setView(view) {
  state.currentView = view;
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  $$('.view-panel').forEach(panel => panel.classList.toggle('active', panel.id === `${view}-view`));
  const pageTitle = $('#page-title');
  if (pageTitle) pageTitle.textContent = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 11. SETTINGS CONTROLLER
function applySettings() {
  // Pet scale
  const scaleMap = { s: 0.85, m: 1, l: 1.18 };
  const scaleVal = scaleMap[state.settings.petSize] || 1;
  document.documentElement.style.setProperty('--pet-scale', scaleVal);

  // Noise overlay
  document.body.classList.toggle('no-noise', !state.settings.noise);
  document.body.classList.toggle('no-animations', !state.settings.animation);
  document.body.classList.toggle('hide-agent-messages', !state.settings.showMessages);

  if (IS_NATIVE_APP) {
    invokeNative('set_companion_always_on_top', { enabled: Boolean(state.settings.keepOnTop) })
      .catch(error => console.warn('Unable to change always-on-top state:', error));
  }

  // Size buttons UI
  $$('.size-option:not(.mode-option)').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === state.settings.petSize);
  });

  // Companion Mode UI
  $$('.mode-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === (state.settings.companionMode || 'sprite'));
  });

  // Toggles UI
  $$('[data-setting-key]').forEach(toggle => {
    const key = toggle.dataset.settingKey;
    if (key in state.settings) {
      toggle.classList.toggle('on', Boolean(state.settings[key]));
    }
  });
}

function toggleCompanionMode() {
  const nextMode = (state.settings.companionMode || 'sprite') === 'sprite' ? 'card' : 'sprite';
  state.settings.companionMode = nextMode;
  saveStored(STORAGE_KEYS.SETTINGS, state.settings);
  localStorage.setItem('nuzzle_companion_mode', nextMode);
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('nuzzle-pet-selection');
    channel.postMessage({ companionMode: nextMode });
  }
  applySettings();
  showToast(`Switched companion mode to ${nextMode === 'sprite' ? 'Desktop Sprite' : 'Widget Card'}!`);
}

function setSettingsTab(tabName) {
  state.currentSettingsTab = tabName;
  $$('.settings-tab').forEach(tab => {
    const isTarget = tab.dataset.settingsTab === tabName;
    tab.classList.toggle('active', isTarget);
    tab.setAttribute('aria-selected', String(isTarget));
  });
  $$('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `settings-panel-${tabName}`);
  });
}

// 12. LIVE ACTIVITY SIMULATOR
const SIM_ACTIVITIES = [
  { icon: '✦', type: 'working', title: 'Codex generated component unit tests', sub: 'tool call · run_command', time: 'just now' },
  { icon: '✓', type: 'done', title: 'Claude Code resolved merge conflicts', sub: 'git integration · success', time: 'just now' },
  { icon: '⌁', type: 'working', title: 'Cursor applied inline AI edit', sub: 'fast diff · 3 chunks', time: 'just now' },
  { icon: '✧', type: 'done', title: 'Gemini synthesized documentation', sub: 'multimodal · index.md', time: 'just now' }
];

const AGENT_EVENT_STATES = {
  prompt: { activityType: 'working', petState: 'work', icon: '✦', label: 'received a prompt' },
  tool: { activityType: 'working', petState: 'work', icon: '✦', label: 'is running a tool' },
  tool_call: { activityType: 'working', petState: 'work', icon: '✦', label: 'is running a tool' },
  working: { activityType: 'working', petState: 'work', icon: '✦', label: 'is working' },
  running: { activityType: 'working', petState: 'work', icon: '✦', label: 'is working' },
  waiting: { activityType: 'wait', petState: 'sleep', icon: '◌', label: 'is waiting' },
  wait: { activityType: 'wait', petState: 'sleep', icon: '◌', label: 'is waiting' },
  thinking: { activityType: 'wait', petState: 'sleep', icon: '◌', label: 'is thinking' },
  complete: { activityType: 'done', petState: 'idle', icon: '✓', label: 'completed a task' },
  completed: { activityType: 'done', petState: 'idle', icon: '✓', label: 'completed a task' },
  done: { activityType: 'done', petState: 'idle', icon: '✓', label: 'completed a task' },
  success: { activityType: 'done', petState: 'idle', icon: '✓', label: 'completed a task' },
  review: { activityType: 'done', petState: 'review', icon: '✓', label: 'finished a review' },
  error: { activityType: 'error', petState: 'failed', icon: '!', label: 'encountered an error' },
  failed: { activityType: 'error', petState: 'failed', icon: '!', label: 'encountered an error' },
  failure: { activityType: 'error', petState: 'failed', icon: '!', label: 'encountered an error' }
};

function normalizeAgentEvent(payload = {}) {
  const rawType = String(payload.type || payload.event || payload.kind || 'working')
    .trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  const config = AGENT_EVENT_STATES[rawType] || AGENT_EVENT_STATES.working;
  const agent = String(payload.agentName || payload.agent || 'Agent').trim().slice(0, 80);
  const title = String(payload.title || `${agent} ${config.label}`).trim().slice(0, 160);
  const sub = String(payload.sub || payload.detail || payload.tool || rawType).trim().slice(0, 160);

  return {
    icon: String(payload.icon || config.icon).slice(0, 4),
    type: config.activityType,
    title,
    sub,
    time: String(payload.time || 'just now').slice(0, 40),
    petState: config.petState,
    durationMs: Number.isFinite(payload.durationMs) ? Math.max(500, Math.min(payload.durationMs, 10000)) : 2400
  };
}

function dispatchAgentEvent(payload = {}, { toast = true } = {}) {
  const safePayload = state.settings.showMessages ? payload : {
    ...payload,
    title: `${payload.agentName || payload.agent || 'Agent'} activity`,
    sub: payload.type || payload.kind || 'local event'
  };
  const item = normalizeAgentEvent(safePayload);
  state.activity.unshift(item);
  if (state.activity.length > 10) state.activity.pop();
  renderActivity();
  setPetState(item.petState, item.durationMs);
  if (item.type === 'done') {
    playChime('completion');
  } else {
    playChime('pop');
  }
  if (toast) showToast(item.title);
  return item;
}

function simulateAgentEvent() {
  const item = SIM_ACTIVITIES[Math.floor(Math.random() * SIM_ACTIVITIES.length)];
  dispatchAgentEvent({
    type: item.type === 'done' ? 'complete' : 'tool',
    icon: item.icon,
    title: item.title,
    sub: item.sub,
    time: item.time
  });
}

async function configureAgent(agentId, shouldInstall = true) {
  const agent = state.agents.find(item => item.id === agentId);
  if (!agent) return;
  if (!IS_NATIVE_APP) {
    showToast('Agent connections are available in the native Nuzzle app.');
    return;
  }
  try {
    const command = shouldInstall ? 'install_integration' : 'uninstall_integration';
    const summary = await invokeNative(command, { id: agentId });
    Object.assign(agent, {
      active: summary.installed,
      available: summary.available,
      healthy: summary.healthy,
      message: summary.message,
      configPath: summary.configPath
    });
    renderAgents();
    playChime(summary.installed ? 'bell' : 'pop');
    showToast(`${agent.name} ${summary.installed ? 'connected' : 'disconnected'} safely.`);
  } catch (error) {
    showToast(`${agent.name}: ${error}`);
  }
}

async function autoSetCodex() {
  return configureAgent('codex', true);
}

async function refreshNativeIntegrations() {
  if (!IS_NATIVE_APP) return;
  try {
    const integrations = await invokeNative('list_integrations');
    state.agents = INITIAL_AGENTS.map(base => {
      const summary = integrations.find(item => item.id === base.id);
      return summary ? {
        ...base,
        active: summary.installed,
        available: summary.available,
        healthy: summary.healthy,
        message: summary.message,
        configPath: summary.configPath
      } : { ...base };
    });
    renderAgents();
    const runtime = await invokeNative('get_runtime_status');
    const status = $('#system-status-btn');
    if (status) status.lastChild.textContent = ` native runtime · ${runtime.acceptedEvents} events`;
    const mode = $('.eyebrow-mono');
    if (mode) mode.textContent = 'NATIVE HOOKS READY';
  } catch (error) {
    console.warn('Native integration status failed:', error);
  }
}

function applyNativePetSelection(petId) {
  if (!PETS.some(pet => pet.id === petId) || state.selectedPetId === petId) return;
  state.selectedPetId = petId;
  saveStored(STORAGE_KEYS.SELECTED_PET, petId);
  renderFeaturedPet();
  renderPetStrip();
  renderLibrary($('.filter-button.active')?.dataset.filter || 'all', $('#pet-search')?.value || '');
  updatePipWindow();
  if (typeof window.updateMiniUI === 'function') window.updateMiniUI();
}

async function pollNativeState() {
  if (!IS_NATIVE_APP || nativePollInFlight) return;
  nativePollInFlight = true;
  try {
    const [batch, desktopState] = await Promise.all([
      invokeNative('get_runtime_events', { afterSequence: nativeEventSequence }),
      invokeNative('get_desktop_state')
    ]);
    for (const entry of batch.events || []) {
      dispatchAgentEvent(entry.event || {});
    }
    nativeEventSequence = batch.latestSequence || nativeEventSequence;
    if (desktopState.revision !== nativePetRevision) {
      nativePetRevision = desktopState.revision;
      applyNativePetSelection(desktopState.selectedPetId);
    }
    const status = $('#system-status-btn');
    if (status) status.lastChild.textContent = ` native runtime · ${nativeEventSequence} events`;
  } catch (error) {
    console.warn('Native state poll failed:', error);
  } finally {
    nativePollInFlight = false;
  }
}

window.nuzzle = window.nuzzle || {};
window.nuzzle.dispatchAgentEvent = dispatchAgentEvent;
window.nuzzle.floatPetOnDesktop = floatPetOnDesktop;
window.nuzzle.autoSetCodex = autoSetCodex;
window.nuzzle.configureAgent = configureAgent;
window.nuzzle.patActivePet = patActivePet;
window.nuzzle.selectCompanion = selectCompanion;
window.addEventListener('nuzzle:agent-event', event => dispatchAgentEvent(event.detail || {}));
window.addEventListener('message', event => {
  if (event.source !== window || event.data?.source !== 'nuzzle-agent') return;
  dispatchAgentEvent(event.data.event || event.data);
});
if ('BroadcastChannel' in window) {
  const agentEventChannel = new BroadcastChannel('nuzzle-agent-events');
  agentEventChannel.addEventListener('message', event => dispatchAgentEvent(event.data || {}));
}

// Server-Sent Events (SSE) Live Agent Bridge Listener
if (!IS_NATIVE_APP && typeof window !== 'undefined' && 'EventSource' in window) {
  try {
    const sse = new EventSource('/events/stream');
    sse.addEventListener('message', event => {
      try {
        if (!event.data || event.data.startsWith(':')) return;
        const payload = JSON.parse(event.data);
        dispatchAgentEvent(payload);
      } catch (err) {
        console.warn('Malformed SSE event payload:', err);
      }
    });
    sse.addEventListener('error', () => {
      // Reconnect is handled natively by browser EventSource
    });
  } catch (err) {
    // Static mode without bridge server
  }
}

if (IS_NATIVE_APP && TAURI?.event?.listen) {
  TAURI.event.listen('nuzzle-agent-event', incoming => {
    const entry = incoming.payload || {};
    nativeEventSequence = Math.max(nativeEventSequence, Number(entry.sequence) || 0);
    dispatchAgentEvent(entry.event || entry);
  }).catch(error => console.warn('Native event listener failed:', error));
}

// 13. DATE/TIME TICKER
function updateDateTime() {
  const el = $('#hero-datetime');
  if (!el) return;
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  el.textContent = now.toLocaleDateString('en-US', options);
}

// 14. GLOBAL EVENT DELEGATION
document.addEventListener('click', event => {
  // Rail navigation
  const nav = event.target.closest('[data-view]');
  if (nav) return setView(nav.dataset.view);

  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) {
    openPalette(false);
    return setView(viewTarget.dataset.viewTarget);
  }

  // Toast triggers
  const toastTarget = event.target.closest('[data-toast]');
  if (toastTarget) showToast(toastTarget.dataset.toast);

  // Float pet on desktop action
  if (event.target.id === 'float-desktop-btn' || event.target.closest('#float-desktop-btn') || event.target.id === 'topbar-float-btn' || event.target.closest('#topbar-float-btn')) {
    floatPetOnDesktop();
    return;
  }

  // Companion pet action
  if (event.target.id === 'pet-me-button' || event.target.closest('#hero-pet-art')) {
    patActivePet();
    return;
  }

  // Pet selection from library or tiles
  const selectAction = event.target.closest('[data-action="select-companion"]');
  if (selectAction) {
    selectCompanion(selectAction.dataset.petId);
    return;
  }

  const petTile = event.target.closest('.pet-tile');
  if (petTile && !event.target.closest('button')) {
    selectCompanion(petTile.dataset.petId);
    return;
  }

  // Favorite heart click
  const favBtn = event.target.closest('[data-fav-id]');
  if (favBtn) {
    event.stopPropagation();
    toggleFavorite(favBtn.dataset.favId);
    return;
  }

  // Library filter tabs
  const filterBtn = event.target.closest('[data-filter]');
  if (filterBtn) {
    $$('.filter-button').forEach(b => {
      const active = b === filterBtn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    renderLibrary(filterBtn.dataset.filter, $('#pet-search')?.value || '');
    return;
  }

  // Settings sub tabs
  const settingsTab = event.target.closest('[data-settings-tab]');
  if (settingsTab) {
    setSettingsTab(settingsTab.dataset.settingsTab);
    return;
  }

  // Settings toggles
  const settingToggle = event.target.closest('[data-setting-key]');
  if (settingToggle) {
    const key = settingToggle.dataset.settingKey;
    state.settings[key] = !state.settings[key];
    saveStored(STORAGE_KEYS.SETTINGS, state.settings);
    applySettings();
    playChime('pop');
    showToast(`${key} is now ${state.settings[key] ? 'enabled' : 'disabled'}`);
    return;
  }

  // Agent toggle switch
  const agentToggle = event.target.closest('[data-agent-toggle]');
  if (agentToggle) {
    const agentId = agentToggle.dataset.agentToggle;
    const targetAgent = state.agents.find(a => a.id === agentId);
    if (targetAgent) {
      configureAgent(agentId, !targetAgent.active);
    }
    return;
  }

  const configureButton = event.target.closest('[data-action="configure-agent"]');
  if (configureButton) {
    const targetAgent = state.agents.find(agent => agent.id === configureButton.dataset.agentId);
    if (targetAgent) configureAgent(targetAgent.id, !targetAgent.active);
    return;
  }

  // Mode option picker (Sprite vs Card)
  const modeOpt = event.target.closest('.mode-option');
  if (modeOpt) {
    const newMode = modeOpt.dataset.mode;
    state.settings.companionMode = newMode;
    saveStored(STORAGE_KEYS.SETTINGS, state.settings);
    localStorage.setItem('nuzzle_companion_mode', newMode);
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('nuzzle-pet-selection');
      channel.postMessage({ companionMode: newMode });
    }
    applySettings();
    playChime('pop');
    showToast(`Companion floating style: ${newMode === 'sprite' ? 'Desktop Sprite (Codex)' : 'Widget Card'}`);
    return;
  }

  // Size option picker
  const sizeOpt = event.target.closest('.size-option:not(.mode-option)');
  if (sizeOpt) {
    state.settings.petSize = sizeOpt.dataset.size;
    saveStored(STORAGE_KEYS.SETTINGS, state.settings);
    applySettings();
    playChime('pop');
    showToast(`Pet size set to ${sizeOpt.dataset.size.toUpperCase()}`);
    return;
  }

  // Reset data button
  if (event.target.id === 'reset-data-btn') {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    state.selectedPetId = 'hu-tao';
    state.favorites = new Set(['hu-tao', 'ganyu']);
    state.settings = { petSize: 'm', noise: true, animation: true, showMessages: true, launchGreeting: true, keepOnTop: true, petSounds: true, completionSounds: false };
    state.agents = INITIAL_AGENTS.map(agent => ({ ...agent }));
    applySettings();
    renderFeaturedPet();
    renderPetStrip();
    renderLibrary();
    renderAgents();
    showToast('Preferences restored to defaults.');
    return;
  }

  // Simulate event button
  if (event.target.id === 'simulate-event-button') {
    simulateAgentEvent();
    return;
  }

  // Summon button in hero
  if (event.target.id === 'summon-button') {
    openPalette(true);
    return;
  }

  // Command palette item click
  const paletteItem = event.target.closest('[data-palette-id]');
  if (paletteItem) {
    const item = PALETTE_ACTIONS.find(p => p.id === paletteItem.dataset.paletteId);
    if (item && item.action) {
      openPalette(false);
      item.action();
    }
    return;
  }

  // Close palette on backdrop click
  if (event.target === $('#command-palette')) {
    openPalette(false);
  }
});

// Search input listeners
$('#pet-search')?.addEventListener('input', e => {
  const activeFilter = $('.filter-button.active')?.dataset.filter || 'all';
  renderLibrary(activeFilter, e.target.value);
});

$('#palette-input')?.addEventListener('input', e => {
  state.paletteIndex = 0;
  renderCommandPalette(e.target.value);
});

// Keyboard navigation (⌘ K, Esc, 1-4, Arrows)
document.addEventListener('keydown', event => {
  const paletteOpen = $('#command-palette')?.classList.contains('open');

  // Command palette open trigger
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openPalette(!paletteOpen);
    return;
  }

  if (paletteOpen) {
    if (event.key === 'Escape') {
      openPalette(false);
      return;
    }
    if (['1', '2', '3', '4'].includes(event.key) && !$('#palette-input').value) {
      event.preventDefault();
      const viewMap = { '1': 'overview', '2': 'library', '3': 'agents', '4': 'settings' };
      openPalette(false);
      setView(viewMap[event.key]);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const count = $$('#palette-results .palette-item').length;
      if (count > 0) {
        state.paletteIndex = (state.paletteIndex + 1) % count;
        renderCommandPalette($('#palette-input')?.value || '');
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const count = $$('#palette-results .palette-item').length;
      if (count > 0) {
        state.paletteIndex = (state.paletteIndex - 1 + count) % count;
        renderCommandPalette($('#palette-input')?.value || '');
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      executePaletteItem(state.paletteIndex);
      return;
    }
  }
});

// 15. INITIALIZATION
renderFeaturedPet();
renderPetStrip();
renderLibrary();
renderAgents();
renderActivity();
applySettings();
refreshNativeIntegrations();
pollNativeState();
updateDateTime();
setInterval(updateDateTime, 30000);
if (IS_NATIVE_APP) setInterval(pollNativeState, 250);

if (state.settings.launchGreeting) {
  setTimeout(() => {
    setPetState('pat', 1600);
    createHeartBurst();
  }, 400);
}
