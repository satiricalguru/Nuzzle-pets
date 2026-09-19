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

function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeSegments(str, delimiter = '·') {
  if (!str || typeof str !== 'string') return '';
  return str.split(delimiter).map(s => {
    const trimmed = s.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }).join(' · ');
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
    favorite: true,
    spriteVersion: 2
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

const AGENT_LOGOS = {
  codex: `<svg viewBox="2.5 2.5 19 19" width="22" height="22" fill="none" aria-label="Codex"><defs><linearGradient id="nuzzle-codex-grad" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#9FA8FE"/><stop offset="50%" stop-color="#6B7CFB"/><stop offset="100%" stop-color="#3C46F5"/></linearGradient></defs><path d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388Z" fill="url(#nuzzle-codex-grad)"/><path d="M8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z" fill="#FFFFFF"/><path d="M12.546 13.909a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636z" fill="#FFFFFF"/></svg>`,
  claude: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-label="Claude Code"><path d="m4.714 15.956l4.718-2.648l.079-.23l-.08-.128h-.23l-.79-.048l-2.695-.073l-2.337-.097l-2.265-.122l-.57-.121l-.535-.704l.055-.353l.48-.321l.685.06l1.518.104l2.277.157l1.651.098l2.447.255h.389l.054-.158l-.133-.097l-.103-.098l-2.356-1.596l-2.55-1.688l-1.336-.972l-.722-.491L2 6.223l-.158-1.008l.656-.722l.88.06l.224.061l.893.686l1.906 1.476l2.49 1.833l.364.304l.146-.104l.018-.072l-.164-.274l-1.354-2.446l-1.445-2.49l-.644-1.032l-.17-.619a3 3 0 0 1-.103-.729L6.287.133L6.7 0l.995.134l.42.364l.619 1.415L9.735 4.14l1.555 3.03l.455.898l.243.832l.09.255h.159V9.01l.127-1.706l.237-2.095l.23-2.695l.08-.76l.376-.91l.747-.492l.583.28l.48.685l-.067.444l-.286 1.851l-.558 2.903l-.365 1.942h.213l.243-.242l.983-1.306l1.652-2.064l.728-.82l.85-.904l.547-.431h1.032l.759 1.129l-.34 1.166l-1.063 1.347l-.88 1.142l-1.263 1.7l-.79 1.36l.074.11l.188-.02l2.853-.606l1.542-.28l1.84-.315l.832.388l.09.395l-.327.807l-1.967.486l-2.307.462l-3.436.813l-.043.03l.049.061l1.548.146l.662.036h1.62l3.018.225l.79.522l.473.638l-.08.485l-1.213.62l-1.64-.389l-3.825-.91l-1.31-.329h-.183v.11l1.093 1.068l2.003 1.81l2.508 2.33l.127.578l-.321.455l-.34-.049l-2.204-1.657l-.85-.747l-1.925-1.62h-.127v.17l.443.649l2.343 3.521l.122 1.08l-.17.353l-.607.213l-.668-.122l-1.372-1.924l-1.415-2.168l-1.141-1.943l-.14.08l-.674 7.254l-.316.37l-.728.28l-.607-.461l-.322-.747l.322-1.476l.388-1.924l.316-1.53l.285-1.9l.17-.632l-.012-.042l-.14.018l-1.432 1.967l-2.18 2.945l-1.724 1.845l-.413.164l-.716-.37l.066-.662l.401-.589l2.386-3.036l1.439-1.882l.929-1.086l-.006-.158h-.055L4.138 18.56l-1.13.146l-.485-.456l.06-.746l.231-.243l1.907-1.312Z"/></svg>`,
  cursor: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-label="Cursor"><path d="M11.503.131L1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"/></svg>`,
  antigravity: `<svg viewBox="0 0 112 112" width="22" height="22" fill="none" aria-label="Antigravity"><defs><linearGradient id="nuzzle-ag-grad" x1="15%" y1="85%" x2="85%" y2="85%"><stop offset="0%" stop-color="#4285F4"/><stop offset="28%" stop-color="#34A853"/><stop offset="50%" stop-color="#FBBC05"/><stop offset="72%" stop-color="#EA4335"/><stop offset="100%" stop-color="#4285F4"/></linearGradient></defs><path d="M89.754 92.75c4.667 3.5 11.667 1.167 5.25-5.25-19.25-18.667-15.167-70-39.083-70-23.917 0-19.834 51.333-39.084 70-7 7 .584 8.75 5.25 5.25C40.171 80.5 39.004 58.917 55.921 58.917c16.916 0 15.75 21.583 33.833 33.833Z" fill="url(#nuzzle-ag-grad)"/></svg>`,
  opencode: `<svg viewBox="96 80 320 352" width="22" height="22" fill="none" aria-label="OpenCode"><path d="M320 224V352H192V224H320Z" fill="currentColor" opacity="0.25"/><path fill-rule="evenodd" clip-rule="evenodd" d="M384 416H128V96H384V416ZM320 160H192V352H320V160Z" fill="currentColor"/></svg>`,
  gemini: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-label="Gemini CLI"><defs><linearGradient id="nuzzle-gem-g" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse"><stop stop-color="#08B962"/><stop offset="1" stop-color="#08B962" stop-opacity="0"/></linearGradient><linearGradient id="nuzzle-gem-r" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse"><stop stop-color="#F94543"/><stop offset="1" stop-color="#F94543" stop-opacity="0"/></linearGradient><linearGradient id="nuzzle-gem-y" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse"><stop stop-color="#FABC12"/><stop offset=".46" stop-color="#FABC12" stop-opacity="0"/></linearGradient></defs><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"/><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#nuzzle-gem-g)"/><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#nuzzle-gem-r)"/><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#nuzzle-gem-y)"/></svg>`,
  copilot: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-label="GitHub Copilot CLI"><path d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02S.939 18.492.078 16.997A.6.6 0 0 1 0 16.741v-2.869a1 1 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656c.167-.429.414-1.055.644-1.517a10 10 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368c.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98s4.767.957 6.166 2.093c.584.235 1.077.546 1.474.952c.85.869 1.132 2.037 1.132 3.368c0 .368-.014.733-.052 1.086c.23.462.477 1.088.644 1.517c1.258.364 2.233 1.721 2.605 2.656a.8.8 0 0 1 .053.22v2.869a.6.6 0 0 1-.078.256m-11.75-5.992h-.344a4 4 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492c-1.725 0-2.989-.359-3.782-1.259a2 2 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179s6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259c-1.59 0-2.738-.545-3.508-1.492a4 4 0 0 1-.355-.508m2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1s-1-.451-1-1v-2c0-.549.451-1 1-1m-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1s-1-.451-1-1v-2c0-.549.451-1 1-1m3.313-6.185c.136 1.057.403 1.913.878 2.497c.442.544 1.134.938 2.344.938c1.573 0 2.292-.337 2.657-.751c.384-.435.558-1.15.558-2.361c0-1.14-.243-1.847-.705-2.319c-.477-.488-1.319-.862-2.824-1.025c-1.487-.161-2.192.138-2.533.529c-.269.307-.437.808-.438 1.578v.021q0 .397.063.893m-1.626 0q.063-.496.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578c-.341-.391-1.046-.69-2.533-.529c-1.505.163-2.347.537-2.824 1.025c-.462.472-.705 1.179-.705 2.319c0 1.211.175 1.926.558 2.361c.365.414 1.084.751 2.657.751c1.21 0 1.902-.394 2.344-.938c.475-.584.742-1.44.878-2.497"/></svg>`,
  pi: `<svg viewBox="140 140 520 520" width="22" height="22" aria-label="Pi"><path fill="#F09082" d="M165.29 165.29H517.36V400H400V282.65H165.29Z"/><path fill="#4D9ABF" d="M165.29 282.65H282.65V400H400V517.36H282.65V634.72H165.29Z"/><path fill="#F1BE58" d="M517.36 400H634.72V634.72H517.36Z"/></svg>`
};

const INITIAL_AGENTS = [
  { id: 'codex', name: 'Codex', key: 'codex', mark: AGENT_LOGOS.codex, desc: 'Prompt, tool, approval, completion, and error hooks.', active: false, available: true },
  { id: 'claude-code', name: 'Claude Code', key: 'claude', mark: AGENT_LOGOS.claude, desc: 'Lifecycle hooks through Claude Code settings.', active: false, available: true },
  { id: 'cursor', name: 'Cursor', key: 'cursor', mark: AGENT_LOGOS.cursor, desc: 'Cursor Agent prompt and tool lifecycle hooks.', active: false, available: true },
  { id: 'antigravity', name: 'Antigravity', key: 'antigravity', mark: AGENT_LOGOS.antigravity, desc: 'Antigravity invocation and tool lifecycle hooks.', active: false, available: true },
  { id: 'opencode', name: 'OpenCode', key: 'opencode', mark: AGENT_LOGOS.opencode, desc: 'A local OpenCode plugin forwards lifecycle events.', active: false, available: true },
  { id: 'gemini', name: 'Gemini CLI', key: 'gemini', mark: AGENT_LOGOS.gemini, desc: 'Gemini prompt, tool, permission, completion, and error hooks.', active: false, available: true },
  { id: 'copilot', name: 'GitHub Copilot CLI', key: 'copilot', mark: AGENT_LOGOS.copilot, desc: 'Copilot CLI lifecycle hooks from the user hooks directory.', active: false, available: true },
  { id: 'pi', name: 'Pi', key: 'pi', mark: AGENT_LOGOS.pi, desc: 'A global Pi extension forwards agent, tool, prompt, and completion events.', active: false, available: true }
];

const SAMPLE_EVENTS = [
  { icon: '✦', type: 'working', title: 'Codex is refactoring styles.css', sub: 'Tool call · write_file', time: 'Now' },
  { icon: '✓', type: 'done', title: 'Claude Code finished a review', sub: '12 files · 4m ago', time: '04m' },
  { icon: '◌', type: 'wait', title: 'Cursor is thinking', sub: 'Waiting for response', time: '07m' },
  { icon: '✓', type: 'done', title: 'OpenCode completed a summary', sub: 'Task complete · 11m ago', time: '11m' },
  { icon: '↗', type: 'working', title: 'Antigravity planned agent roadmap', sub: 'Workflow · execute_plan', time: '14m' }
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
    showMessages: loadStored('nuzzle_agent_alerts', false),
    launchGreeting: true,
    keepOnTop: true,
    petSounds: true,
    completionSounds: false
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
  const rows = typeof petOrFile === 'object' && petOrFile.spriteVersion === 2 ? 11 : 9;
  const rowStep = 100 / (rows - 1);
  const rowVariables = Array.from({ length: rows }, (_, row) => `--atlas-row-${row}:${(row * rowStep).toFixed(3)}%`).join(';');
  return `background-image:url('${petUrl(petOrFile)}');--atlas-height:${rows * 100}%;${rowVariables}`;
}

function applyPetArtStyle(element, pet) {
  if (!element) return;
  const rows = pet?.spriteVersion === 2 ? 11 : 9;
  const rowStep = 100 / (rows - 1);
  element.style.backgroundImage = `url('${petUrl(pet)}')`;
  element.style.setProperty('--atlas-height', `${rows * 100}%`);
  for (let row = 0; row < 11; row += 1) {
    if (row < rows) element.style.setProperty(`--atlas-row-${row}`, `${(row * rowStep).toFixed(3)}%`);
    else element.style.removeProperty(`--atlas-row-${row}`);
  }
}

function clearPetLookDirection(element) {
  if (!element) return;
  element.classList.remove('is-looking');
  element.style.removeProperty('background-position-x');
  element.style.removeProperty('background-position-y');
}

function setPetLookDirection(element, pet, clientX, clientY) {
  if (!element || pet?.spriteVersion !== 2 || state.activePetState !== 'idle') {
    clearPetLookDirection(element);
    return;
  }
  const rect = element.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  if (Math.hypot(dx, dy) < Math.min(rect.width, rect.height) * 0.16) {
    clearPetLookDirection(element);
    return;
  }
  const degrees = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const directionIndex = Math.round(degrees / 22.5) % 16;
  const row = directionIndex < 8 ? 9 : 10;
  const column = directionIndex % 8;
  element.classList.add('is-looking');
  element.style.setProperty('background-position-x', `${(column * 100 / 7).toFixed(3)}%`);
  element.style.setProperty('background-position-y', `${row * 10}%`);
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
      applyPetArtStyle(art, pet);
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
        @keyframes pet-frames-5 { from { background-position-x: 0%; } to { background-position-x: 71.429%; } }
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
          background-size: 800% var(--atlas-height, 900%);
          border-radius: 45% 45% 39% 39%;
          box-shadow: 0 8px 16px rgba(77,47,30,0.1);
          cursor: pointer;
          transition: transform 0.15s ease;
          animation: pet-frames-6 1.2s steps(6) infinite, pet-float-gentle 3.6s ease-in-out infinite;
        }
        .pip-art:hover { transform: scale(1.05); }
        .pip-art:active { transform: scale(0.95); }
        .pip-art.state-idle {
          background-position-y: var(--atlas-row-0, 0%);
          animation: pet-frames-6 1.2s steps(6) infinite, pet-float-gentle 3.6s ease-in-out infinite;
        }
        .pip-art.state-pat {
          background-position-y: var(--atlas-row-3, 37.5%);
          animation: pet-frames-4 0.7s steps(4) 3, pet-pat-bounce 0.6s cubic-bezier(.34, 1.56, .64, 1) 1;
        }
        .pip-art.state-jump {
          background-position-y: var(--atlas-row-4, 50%);
          animation: pet-frames-5 0.8s steps(5) 2, pet-pat-bounce 0.6s cubic-bezier(.34, 1.56, .64, 1) 1;
        }
        .pip-art.state-work {
          background-position-y: var(--atlas-row-7, 87.5%);
          animation: pet-frames-6 0.75s steps(6) infinite, pet-float-gentle 2s ease-in-out infinite;
        }
        .pip-art.state-sleep {
          background-position-y: var(--atlas-row-6, 75%);
          animation: pet-frames-6 1.8s steps(6) infinite, pet-float-gentle 5s ease-in-out infinite;
        }
        .pip-art.state-failed {
          background-position-y: var(--atlas-row-5, 62.5%);
          animation: pet-frames-8 1s steps(8) infinite, pet-float-gentle 2.4s ease-in-out infinite;
        }
        .pip-art.state-review {
          background-position-y: var(--atlas-row-8, 100%);
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
        .pip-art.gif-pet.state-jump {
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
      pip.document.addEventListener('pointermove', event => setPetLookDirection(art, pet, event.clientX, event.clientY));
      pip.document.addEventListener('pointerleave', () => clearPetLookDirection(art));
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
  const heroAtlas = $('#hero-pet-atlas');

  if (heroArt) {
    applyPetArtStyle(heroArt, pet);
    heroArt.setAttribute('aria-label', `${pet.name} companion sprite`);
    heroArt.classList.toggle('gif-pet', pet.ext === 'gif');
  }
  if (heroName) heroName.textContent = pet.name;
  if (heroQuote) heroQuote.textContent = pet.quote;
  if (heroBadge) {
    const badgeText = state.favorites.has(pet.id) ? 'Currently your favorite' : capitalize(pet.badge);
    heroBadge.innerHTML = `<span class="mini-spark">✦</span> ${badgeText}`;
  }
  if (heroVibe) heroVibe.textContent = `${capitalize(pet.vibe)} · ${capitalize(pet.element)}`;
  if (heroAtlas) heroAtlas.textContent = pet.spriteVersion === 2 ? 'V2 · 8×11 atlas' : 'V1 · 8×9 atlas';
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
          <small>${capitalizeSegments(pet.note)}</small>
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
            <small>${capitalizeSegments(pet.note)}</small>
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
        <div class="agent-logo ${agent.key}">${AGENT_LOGOS[agent.key] || agent.mark}</div>
        <button class="toggle ${agent.active ? 'on' : ''}" data-agent-toggle="${agent.id}" aria-label="${agent.active ? 'Disconnect' : 'Connect'} ${agent.name}" ${!agent.available && !agent.active ? 'disabled' : ''}>
          <span></span>
        </button>
      </div>
      <h3>${agent.name}</h3>
      <p>${agent.desc}</p>
      <div class="agent-card-foot">
        <span><i class="${agent.healthy ? 'green-dot' : 'status-dot-muted'}"></i> ${agent.active ? 'Connected' : agent.available ? 'Detected' : 'Not detected'}</span>
        <button data-action="configure-agent" data-agent-id="${agent.id}" ${!agent.available && !agent.active ? 'disabled' : ''}>${agent.active ? 'Disconnect' : 'Connect'} ↗</button>
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
      <span class="activity-time">${escapeHtml(capitalize(item.time))}</span>
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
function showToast(message, options = {}) {
  const region = $('.toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = document.createElement('span');
  icon.textContent = options?.icon || (options?.type === 'done' ? '✓' : options?.type === 'error' ? '!' : '✦');
  const text = document.createElement('span');
  text.textContent = capitalize(String(message ?? ''));
  toast.appendChild(icon);
  toast.appendChild(text);
  region.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade');
    setTimeout(() => toast.remove(), 300);
  }, options?.duration || 2400);
}

window.showToast = showToast;
window.nuzzle = window.nuzzle || {};
window.nuzzle.showToast = showToast;

// 10. NAVIGATION & VIEW CONTROLLER
function setView(view) {
  state.currentView = view;
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  $$('.view-panel').forEach(panel => panel.classList.toggle('active', panel.id === `${view}-view`));
  const pageTitle = $('#page-title');
  if (pageTitle) pageTitle.textContent = capitalize(view);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 11. SETTINGS CONTROLLER
function applySettings() {
  // Pet scale (Small: 0.75x, Medium: 1.0x, Large: 1.3x, Extra Large: 1.6x)
  const scaleMap = { s: 0.75, m: 1, l: 1.3, xl: 1.6 };
  const scaleVal = scaleMap[state.settings.petSize] || 1;
  document.documentElement.style.setProperty('--pet-scale', scaleVal);
  localStorage.setItem('nuzzle_pet_size', state.settings.petSize);

  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('nuzzle-pet-size-sync');
      channel.postMessage({ petSize: state.settings.petSize, scale: scaleVal });
    } catch {}
  }

  // Noise overlay
  document.body.classList.toggle('no-noise', !state.settings.noise);
  document.body.classList.toggle('no-animations', !state.settings.animation);
  document.body.classList.toggle('hide-agent-messages', !state.settings.showMessages);

  if (IS_NATIVE_APP) {
    invokeNative('set_companion_always_on_top', { enabled: Boolean(state.settings.keepOnTop) })
      .catch(error => console.warn('Unable to change always-on-top state:', error));
  }

  // Size buttons UI
  $$('.size-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === state.settings.petSize);
  });

  // Toggles UI
  $$('[data-setting-key]').forEach(toggle => {
    const key = toggle.dataset.settingKey;
    if (key in state.settings) {
      toggle.classList.toggle('on', Boolean(state.settings[key]));
    }
  });
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
  { icon: '✦', type: 'working', title: 'Codex generated component unit tests', sub: 'Tool call · run_command', time: 'Just now' },
  { icon: '✓', type: 'done', title: 'Claude Code resolved merge conflicts', sub: 'Git integration · success', time: 'Just now' },
  { icon: '⌁', type: 'working', title: 'Cursor applied inline AI edit', sub: 'Fast diff · 3 chunks', time: 'Just now' },
  { icon: '◎', type: 'done', title: 'OpenCode summarized documentation', sub: 'Task complete · index.md', time: 'Just now' }
];

const AGENT_EVENT_STATES = {
  prompt: { activityType: 'working', petState: 'work', icon: '✦', label: 'received a prompt', important: false },
  tool: { activityType: 'working', petState: 'work', icon: '✦', label: 'is running a tool', important: false },
  tool_call: { activityType: 'working', petState: 'work', icon: '✦', label: 'is running a tool', important: false },
  working: { activityType: 'working', petState: 'work', icon: '✦', label: 'is working', important: false },
  running: { activityType: 'working', petState: 'work', icon: '✦', label: 'is working', important: false },
  waiting: { activityType: 'wait', petState: 'sleep', icon: '◌', label: 'needs your attention', important: true },
  wait: { activityType: 'wait', petState: 'sleep', icon: '◌', label: 'needs your attention', important: true },
  thinking: { activityType: 'wait', petState: 'sleep', icon: '◌', label: 'is thinking', important: false },
  complete: { activityType: 'done', petState: 'jump', icon: '✓', label: 'completed a task', important: true },
  completed: { activityType: 'done', petState: 'jump', icon: '✓', label: 'completed a task', important: true },
  done: { activityType: 'done', petState: 'jump', icon: '✓', label: 'completed a task', important: true },
  success: { activityType: 'done', petState: 'jump', icon: '✓', label: 'completed a task', important: true },
  review: { activityType: 'done', petState: 'review', icon: '✓', label: 'finished a review', important: true },
  error: { activityType: 'error', petState: 'failed', icon: '!', label: 'encountered an error', important: true },
  failed: { activityType: 'error', petState: 'failed', icon: '!', label: 'encountered an error', important: true },
  failure: { activityType: 'error', petState: 'failed', icon: '!', label: 'encountered an error', important: true }
};

function normalizeAgentEvent(payload = {}) {
  const rawType = String(payload.type || payload.event || payload.kind || 'working')
    .trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  const config = AGENT_EVENT_STATES[rawType] || AGENT_EVENT_STATES.working;
  const agent = String(payload.agentName || payload.agent || 'Agent').trim().slice(0, 80);
  const title = String(payload.title || `${agent} ${config.label}`).trim().slice(0, 160);
  const sub = String(payload.sub || payload.detail || payload.tool || rawType).trim().slice(0, 160);

  const isImportant = payload.important === true ||
    (payload.important !== false && (
      Boolean(config.important) ||
      ['done', 'error', 'wait'].includes(config.activityType) ||
      ['complete', 'completed', 'done', 'success', 'error', 'failed', 'failure', 'waiting', 'permission', 'review'].includes(rawType)
    ));

  return {
    icon: String(payload.icon || config.icon).slice(0, 4),
    type: config.activityType,
    title: capitalize(title),
    sub,
    time: capitalize(String(payload.time || 'Just now').slice(0, 40)),
    petState: config.petState,
    durationMs: Number.isFinite(payload.durationMs) ? Math.max(500, Math.min(payload.durationMs, 10000)) : 2400,
    important: isImportant
  };
}

function dispatchAgentEvent(payload = {}, { toast = true } = {}) {
  const item = normalizeAgentEvent(payload);
  state.activity.unshift(item);
  if (state.activity.length > 10) state.activity.pop();
  renderActivity();
  setPetState(item.petState, item.durationMs);
  if (item.type === 'done') {
    playChime('completion');
  } else {
    playChime('pop');
  }
  if (toast && state.settings.showMessages) {
    showToast(item.title, { icon: item.icon, type: item.type, important: item.important, isAgent: true });
  }
  return item;
}

function simulateAgentEvent() {
  const item = SIM_ACTIVITIES[Math.floor(Math.random() * SIM_ACTIVITIES.length)];
  dispatchAgentEvent({
    type: item.type === 'done' ? 'complete' : 'tool',
    icon: item.icon,
    title: item.title,
    sub: item.sub,
    time: item.time,
    important: item.type === 'done'
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
    if (status) status.lastChild.textContent = ` Native runtime · ${runtime.acceptedEvents} events`;
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
      const sequence = Number(entry.sequence) || 0;
      if (sequence && sequence <= nativeEventSequence) continue;
      dispatchAgentEvent(entry.event || {});
      nativeEventSequence = Math.max(nativeEventSequence, sequence);
    }
    nativeEventSequence = Math.max(nativeEventSequence, Number(batch.latestSequence) || 0);
    if (desktopState.revision !== nativePetRevision) {
      nativePetRevision = desktopState.revision;
      applyNativePetSelection(desktopState.selectedPetId);
    }
    const status = $('#system-status-btn');
    if (status) status.lastChild.textContent = ` Native runtime · ${nativeEventSequence} events`;
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
window.nuzzle.setPetLookDirection = setPetLookDirection;
window.nuzzle.clearPetLookDirection = clearPetLookDirection;
window.nuzzle.artStyle = artStyle;
document.addEventListener('pointermove', event => {
  const pet = PETS.find(item => item.id === state.selectedPetId) || PETS[0];
  $$('.pet-art, .mini-art').forEach(art => setPetLookDirection(art, pet, event.clientX, event.clientY));
});
document.documentElement.addEventListener('mouseleave', () => {
  $$('.pet-art, .mini-art').forEach(clearPetLookDirection);
});
window.addEventListener('nuzzle:agent-event', event => dispatchAgentEvent(event.detail || {}));
window.addEventListener('message', event => {
  if (event.source !== window || event.data?.source !== 'nuzzle-agent') return;
  dispatchAgentEvent(event.data.event || event.data);
});
if ('BroadcastChannel' in window) {
  const agentEventChannel = new BroadcastChannel('nuzzle-agent-events');
  agentEventChannel.addEventListener('message', event => dispatchAgentEvent(event.data || {}));

  const agentAlertsChannel = new BroadcastChannel('nuzzle-agent-alerts');
  agentAlertsChannel.addEventListener('message', event => {
    if (typeof event.data?.agentAlerts === 'boolean') {
      state.settings.showMessages = event.data.agentAlerts;
      saveStored(STORAGE_KEYS.SETTINGS, state.settings);
      document.body.classList.toggle('hide-agent-messages', !state.settings.showMessages);
    }
  });
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
    const sequence = Number(entry.sequence) || 0;
    if (sequence && sequence <= nativeEventSequence) return;
    nativeEventSequence = Math.max(nativeEventSequence, sequence);
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
  // Size option picker
  const sizeOpt = event.target.closest('.size-option');
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
    state.settings = { petSize: 'm', noise: true, animation: true, showMessages: false, launchGreeting: true, keepOnTop: true, petSounds: true, completionSounds: false };
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

if ('BroadcastChannel' in window) {
  try {
    const sizeChannel = new BroadcastChannel('nuzzle-pet-size-sync');
    sizeChannel.addEventListener('message', event => {
      if (event.data?.petSize && event.data.petSize !== state.settings.petSize) {
        state.settings.petSize = event.data.petSize;
        saveStored(STORAGE_KEYS.SETTINGS, state.settings);
        applySettings();
      }
    });
  } catch {}
}

if (state.settings.launchGreeting) {
  setTimeout(() => {
    setPetState('pat', 1600);
    createHeartBurst();
  }, 400);
}
