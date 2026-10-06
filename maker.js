/**
 * Nuzzle — Pet Maker
 * Procedurally draws a complete Codex v1 atlas (8 columns × 9 rows of 192×208
 * cells) from a few creature parameters, entirely offline. Each frame is drawn
 * on a 48×52 pixel grid and scaled 4× with nearest-neighbour sampling.
 */
(() => {
  const CELL_W = 192;
  const CELL_H = 208;
  const GRID_W = 48;
  const GRID_H = 52;
  const SCALE = CELL_W / GRID_W;
  // Codex v1 row contract: frames used per row.
  const ROWS = [
    { key: 'idle', frames: 6 },
    { key: 'run-right', frames: 8 },
    { key: 'run-left', frames: 8 },
    { key: 'wave', frames: 4 },
    { key: 'jump', frames: 5 },
    { key: 'failed', frames: 8 },
    { key: 'wait', frames: 6 },
    { key: 'work', frames: 6 },
    { key: 'review', frames: 6 }
  ];
  const PREVIEW_STATES = [
    ['idle', 'Idle'], ['run', 'Run'], ['walk-left', 'Run left'], ['pat', 'Wave'], ['jump', 'Jump'],
    ['failed', 'Oops'], ['sleep', 'Wait'], ['work', 'Work'], ['review', 'Review']
  ];

  const SPECIES = {
    cat: { label: 'Cat', words: ['cat', 'kitten', 'kitty', 'tabby', 'neko'] },
    fox: { label: 'Fox', words: ['fox', 'kitsune'] },
    dog: { label: 'Puppy', words: ['dog', 'puppy', 'pup', 'doggo', 'shiba', 'corgi'] },
    bunny: { label: 'Bunny', words: ['bunny', 'rabbit', 'hare'] },
    bear: { label: 'Bear', words: ['bear', 'teddy'] },
    panda: { label: 'Panda', words: ['panda'] },
    frog: { label: 'Frog', words: ['frog', 'toad'] },
    chick: { label: 'Chick', words: ['chick', 'bird', 'duck', 'duckling', 'birdie', 'penguin'] },
    dragon: { label: 'Dragon', words: ['dragon', 'dino', 'dinosaur', 'lizard'] },
    ghost: { label: 'Ghost', words: ['ghost', 'spirit', 'phantom', 'spooky'] },
    robot: { label: 'Robot', words: ['robot', 'bot', 'android', 'mecha', 'droid'] },
    slime: { label: 'Slime', words: ['slime', 'blob', 'jelly', 'mochi', 'pudding'] }
  };
  const PATTERNS = {
    none: { label: 'Plain', words: [] },
    belly: { label: 'Light belly', words: ['belly', 'tummy'] },
    spots: { label: 'Spots', words: ['spots', 'spotted', 'dots', 'dotted', 'dalmatian'] },
    stripes: { label: 'Stripes', words: ['stripes', 'striped', 'tabby', 'tiger'] }
  };
  const ACCESSORIES = {
    none: { label: 'None', words: [] },
    bow: { label: 'Bow', words: ['bow', 'ribbon'] },
    crown: { label: 'Crown', words: ['crown', 'king', 'queen', 'royal', 'prince', 'princess'] },
    party: { label: 'Party hat', words: ['party', 'birthday', 'hat'] },
    glasses: { label: 'Glasses', words: ['glasses', 'nerd', 'specs', 'smart'] },
    shades: { label: 'Sunglasses', words: ['sunglasses', 'shades', 'cool'] },
    headphones: { label: 'Headphones', words: ['headphones', 'music', 'dj', 'headset'] },
    flower: { label: 'Flower', words: ['flower', 'blossom', 'sakura', 'daisy'] },
    scarf: { label: 'Scarf', words: ['scarf', 'winter', 'cozy'] }
  };
  const COLORS = {
    red: '#e2574c', crimson: '#c8384a', orange: '#f2a65a', ginger: '#ee8f4d', yellow: '#f4d35e',
    gold: '#e7bc55', golden: '#e7bc55', green: '#7fc47a', mint: '#a8e6cf', lime: '#b5d96b',
    teal: '#3fb6a8', cyan: '#62d0e6', blue: '#5b8def', navy: '#34477a', sky: '#8ec5ff',
    purple: '#9b7be0', violet: '#9b7be0', lavender: '#c3b1f0', pink: '#f5a3c0', rose: '#ef8fa6',
    peach: '#ffc8a8', brown: '#a8754f', chocolate: '#7a5236', tan: '#d8b48a', cream: '#f6ead2',
    white: '#f7f4ef', snow: '#fbfbfb', grey: '#a8a6a3', gray: '#a8a6a3', silver: '#c9ccd3',
    black: '#3a3740', charcoal: '#4a4650', midnight: '#2d3150'
  };
  const PRESETS = {
    cute: { bodies: ['#f5a3c0', '#ffc8a8', '#c3b1f0', '#a8e6cf', '#f6ead2'], accessories: ['bow', 'flower', 'none'], patterns: ['belly', 'none'] },
    cool: { bodies: ['#34477a', '#3a3740', '#5b8def', '#3fb6a8', '#9b7be0'], accessories: ['shades', 'headphones', 'none'], patterns: ['stripes', 'none', 'belly'] },
    funny: { bodies: ['#f4d35e', '#b5d96b', '#ee8f4d', '#62d0e6', '#e2574c'], accessories: ['party', 'glasses', 'crown'], patterns: ['spots', 'belly'] }
  };
  const NAME_PARTS = ['Mo', 'Pip', 'Lu', 'Bo', 'Ki', 'Nu', 'Ta', 'Zu', 'Mi', 'Fen', 'Po', 'Ru'];
  const NAME_ENDS = ['chi', 'ffin', 'mo', 'zzle', 'bit', 'nky', 'lo', 'pop', 'ra', 'bean', 'kin', 'to'];

  // ── Colour helpers ───────────────────────────────────────────────────────
  function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  function mix(hex, target, amount) {
    const [r, g, b] = hexToRgb(hex);
    const [tr, tg, tb] = hexToRgb(target);
    const channel = (from, to) => Math.round(from + (to - from) * amount).toString(16).padStart(2, '0');
    return `#${channel(r, tr)}${channel(g, tg)}${channel(b, tb)}`;
  }
  const shade = (hex, amount) => mix(hex, '#1a1418', amount);
  const tint = (hex, amount) => mix(hex, '#ffffff', amount);
  function isDark(hex) {
    const [r, g, b] = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 < 110;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (random, list) => list[Math.floor(random() * list.length)];

  // ── Frame painter ────────────────────────────────────────────────────────
  const grid = document.createElement('canvas');
  grid.width = GRID_W;
  grid.height = GRID_H;
  const g = grid.getContext('2d', { willReadFrequently: true });

  const px = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const ellipse = (cx, cy, rx, ry, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    g.fill();
  };
  const poly = (points, color) => {
    g.fillStyle = color;
    g.beginPath();
    points.forEach(([x, y], index) => (index ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  };

  // Snap antialiased shapes to crisp pixels, then trace a 1px outline.
  function crispAndOutline(outline) {
    const image = g.getImageData(0, 0, GRID_W, GRID_H);
    const data = image.data;
    for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= 110 ? 255 : 0;
    const [r, gg, b] = hexToRgb(outline);
    const solid = index => data[index * 4 + 3] === 255;
    const edge = [];
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const index = y * GRID_W + x;
        if (solid(index)) continue;
        if ((x > 0 && solid(index - 1)) || (x < GRID_W - 1 && solid(index + 1)) ||
            (y > 0 && solid(index - GRID_W)) || (y < GRID_H - 1 && solid(index + GRID_W))) {
          edge.push(index);
        }
      }
    }
    edge.forEach(index => {
      data[index * 4] = r;
      data[index * 4 + 1] = gg;
      data[index * 4 + 2] = b;
      data[index * 4 + 3] = 255;
    });
    g.putImageData(image, 0, 0);
  }

  function drawEyes(p, pose, headX, headY) {
    const ink = p.species === 'robot' ? tint(p.accent, 0.1) : '#2a2228';
    const spread = p.species === 'frog' ? 8 : 5;
    const look = pose.look || 0;
    const eyeY = p.species === 'frog' ? headY - 8 : headY;
    [-1, 1].forEach(side => {
      const x = headX + side * spread + look - 1;
      const y = eyeY;
      switch (pose.eyes) {
        case 'closed':
          px(x, y + 1, 3, 1, ink);
          break;
        case 'happy':
          px(x, y + 1, 1, 1, ink); px(x + 1, y, 1, 1, ink); px(x + 2, y + 1, 1, 1, ink);
          break;
        case 'x':
          px(x, y - 1, 1, 1, ink); px(x + 2, y - 1, 1, 1, ink); px(x + 1, y, 1, 1, ink);
          px(x, y + 1, 1, 1, ink); px(x + 2, y + 1, 1, 1, ink);
          break;
        case 'down':
          px(x, y + 1, 3, 2, ink);
          break;
        default:
          px(x, y - 1, 3, 3, ink);
          px(x + (look > 0 ? 1 : 0) + (side < 0 ? 0 : 1), y - 1, 1, 1, '#ffffff');
      }
    });
  }

  function drawMouth(p, pose, headX, headY) {
    const ink = '#2a2228';
    const y = headY + (p.species === 'frog' ? 0 : 4);
    const x = headX + (pose.look || 0) * 0.5;
    if (p.species === 'chick') {
      px(x - 1, y - 1, 3, 2, '#f39a3c');
      if (pose.mouth === 'open') px(x - 1, y + 1, 3, 1, '#c96a2a');
      return;
    }
    if (p.species === 'robot') {
      px(x - 2, y, 5, 1, pose.mouth === 'sad' ? shade(p.accent, 0.5) : tint(p.accent, 0.1));
      return;
    }
    switch (pose.mouth) {
      case 'open':
        px(x - 1, y, 3, 2, ink); px(x, y + 1, 1, 1, '#e36d7a');
        break;
      case 'sad':
        px(x - 1, y + 1, 1, 1, ink); px(x, y, 1, 1, ink); px(x + 1, y + 1, 1, 1, ink);
        break;
      case 'o':
        px(x, y, 1, 1, ink);
        break;
      case 'flat':
        px(x - 1, y, 3, 1, ink);
        break;
      default:
        px(x - 1, y, 1, 1, ink); px(x, y + 1, 1, 1, ink); px(x + 1, y, 1, 1, ink);
    }
  }

  function drawBack(p, pose, cx, bodyY) {
    const back = shade(p.body, 0.12);
    const wag = pose.tail || 0;
    switch (p.species) {
      case 'cat':
        poly([[cx + 6, bodyY + 3], [cx + 15, bodyY - 3 + wag], [cx + 17, bodyY - 6 + wag], [cx + 14, bodyY - 1 + wag], [cx + 8, bodyY + 5]], back);
        break;
      case 'fox':
        ellipse(cx + 12, bodyY - 1 + wag, 6, 4, p.body);
        ellipse(cx + 16, bodyY - 3 + wag, 3, 2.5, p.accent);
        break;
      case 'dog':
        poly([[cx + 6, bodyY + 1], [cx + 13, bodyY - 5 + wag], [cx + 14, bodyY - 3 + wag], [cx + 8, bodyY + 4]], back);
        break;
      case 'dragon':
        poly([[cx - 6, bodyY - 3], [cx - 15, bodyY - 10 - wag], [cx - 12, bodyY - 2], [cx - 6, bodyY + 2]], p.accent);
        poly([[cx + 6, bodyY - 3], [cx + 15, bodyY - 10 - wag], [cx + 12, bodyY - 2], [cx + 6, bodyY + 2]], p.accent);
        poly([[cx + 5, bodyY + 4], [cx + 16, bodyY + 2 + wag], [cx + 18, bodyY + wag], [cx + 8, bodyY + 7]], back);
        break;
      case 'chick':
        break;
      default:
        break;
    }
  }

  function drawEars(p, headX, headY, pose) {
    const inner = p.accent;
    const droop = pose.droop ? 1 : 0;
    switch (p.species) {
      case 'cat':
        poly([[headX - 11, headY - 4], [headX - 9, headY - 15 + droop], [headX - 3, headY - 9]], p.body);
        poly([[headX + 11, headY - 4], [headX + 9, headY - 15 + droop], [headX + 3, headY - 9]], p.body);
        poly([[headX - 9, headY - 6], [headX - 8.5, headY - 12 + droop], [headX - 5, headY - 8]], inner);
        poly([[headX + 9, headY - 6], [headX + 8.5, headY - 12 + droop], [headX + 5, headY - 8]], inner);
        break;
      case 'fox':
        poly([[headX - 13, headY - 3], [headX - 11, headY - 18 + droop], [headX - 2, headY - 9]], p.body);
        poly([[headX + 13, headY - 3], [headX + 11, headY - 18 + droop], [headX + 2, headY - 9]], p.body);
        poly([[headX - 10, headY - 6], [headX - 10, headY - 14 + droop], [headX - 5, headY - 9]], inner);
        poly([[headX + 10, headY - 6], [headX + 10, headY - 14 + droop], [headX + 5, headY - 9]], inner);
        break;
      case 'bunny':
        ellipse(headX - 5, headY - 15 + droop, 3, 8, p.body);
        ellipse(headX + 5, headY - 15 + droop * 2, 3, 8, p.body);
        ellipse(headX - 5, headY - 14 + droop, 1.4, 5.5, inner);
        ellipse(headX + 5, headY - 14 + droop * 2, 1.4, 5.5, inner);
        break;
      case 'bear':
      case 'panda': {
        const ear = p.species === 'panda' ? '#3a3740' : p.body;
        ellipse(headX - 10, headY - 9, 4, 4, ear);
        ellipse(headX + 10, headY - 9, 4, 4, ear);
        if (p.species === 'bear') {
          ellipse(headX - 10, headY - 9, 2, 2, inner);
          ellipse(headX + 10, headY - 9, 2, 2, inner);
        }
        break;
      }
      case 'frog':
        ellipse(headX - 8, headY - 8, 5, 4.5, p.body);
        ellipse(headX + 8, headY - 8, 5, 4.5, p.body);
        ellipse(headX - 8, headY - 8, 3, 3, '#ffffff');
        ellipse(headX + 8, headY - 8, 3, 3, '#ffffff');
        break;
      case 'dragon':
        poly([[headX - 8, headY - 8], [headX - 10, headY - 15], [headX - 4, headY - 10]], tint(p.accent, 0.2));
        poly([[headX + 8, headY - 8], [headX + 10, headY - 15], [headX + 4, headY - 10]], tint(p.accent, 0.2));
        break;
      case 'chick':
        poly([[headX - 1, headY - 10], [headX + 1, headY - 15], [headX + 3, headY - 10]], p.body);
        break;
      case 'robot':
        px(headX, headY - 16, 1, 5, shade(p.body, 0.35));
        ellipse(headX + 0.5, headY - 17, 2, 2, pose.blink ? '#f4d35e' : p.accent);
        break;
      default:
        break;
    }
  }

  function drawDogEars(p, headX, headY, pose) {
    if (p.species !== 'dog') return;
    const ear = shade(p.body, 0.22);
    const flap = pose.tail ? 1 : 0;
    ellipse(headX - 11, headY - 1 + flap, 3, 6, ear);
    ellipse(headX + 11, headY - 1 - flap, 3, 6, ear);
  }

  function drawPattern(p, cx, headX, headY, bodyY) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    if (p.pattern === 'belly' || p.species === 'panda') {
      ellipse(cx, bodyY + 1, 5, 4.5, p.species === 'panda' ? '#f7f4ef' : p.accent);
    }
    if (p.pattern === 'spots') {
      const dot = shade(p.body, 0.3);
      [[headX - 7, headY - 5], [headX + 6, headY - 7], [cx + 5, bodyY - 1], [cx - 6, bodyY + 2], [headX + 9, headY + 2]]
        .forEach(([x, y]) => ellipse(x, y, 1.6, 1.4, dot));
    }
    if (p.pattern === 'stripes') {
      const stripe = shade(p.body, 0.28);
      px(headX - 1, headY - 10, 2, 3, stripe);
      px(headX - 5, headY - 9, 1, 3, stripe);
      px(headX + 4, headY - 9, 1, 3, stripe);
      px(cx - 7, bodyY - 2, 3, 1, stripe);
      px(cx + 5, bodyY - 2, 3, 1, stripe);
      px(cx - 7, bodyY + 1, 3, 1, stripe);
      px(cx + 5, bodyY + 1, 3, 1, stripe);
    }
    if (p.species === 'panda') {
      ellipse(headX - 5, headY, 3, 2.6, '#3a3740');
      ellipse(headX + 5, headY, 3, 2.6, '#3a3740');
    }
    if (p.species === 'robot') {
      px(headX - 8, headY - 4, 17, 10, shade(p.body, 0.55));
    }
    if (p.species === 'slime') {
      ellipse(headX - 6, headY - 7, 2.5, 1.5, tint(p.body, 0.55));
    }
    g.restore();
  }

  function drawAccessory(p, headX, headY, pose) {
    const top = headY - (p.species === 'frog' ? 13 : 11);
    switch (p.accessory) {
      case 'bow':
        poly([[headX + 5, top + 1], [headX + 1, top - 2], [headX + 1, top + 4]], '#e2574c');
        poly([[headX + 5, top + 1], [headX + 9, top - 2], [headX + 9, top + 4]], '#e2574c');
        px(headX + 4, top, 2, 2, '#b83a33');
        break;
      case 'crown':
        px(headX - 4, top - 1, 9, 3, '#e7bc55');
        px(headX - 4, top - 4, 1, 3, '#e7bc55'); px(headX, top - 5, 1, 4, '#e7bc55'); px(headX + 4, top - 4, 1, 3, '#e7bc55');
        px(headX, top, 1, 1, '#e2574c');
        px(headX - 4, top + 1, 9, 1, '#c79a35');
        break;
      case 'party':
        poly([[headX - 4, top + 1], [headX + 4, top + 1], [headX + 1, top - 9]], '#5b8def');
        px(headX - 2, top - 2, 2, 1, '#f4d35e'); px(headX + 1, top - 5, 1, 1, '#f4d35e');
        ellipse(headX + 1, top - 10, 1.5, 1.5, '#f5a3c0');
        break;
      case 'glasses': {
        const y = (p.species === 'frog' ? headY - 8 : headY) - 2;
        const look = pose.look || 0;
        g.strokeStyle = '#2a2228';
        g.lineWidth = 1;
        g.strokeRect(headX - 8.5 + look, y + 0.5, 6, 4);
        g.strokeRect(headX + 2.5 + look, y + 0.5, 6, 4);
        px(headX - 2 + look, y + 2, 4, 1, '#2a2228');
        break;
      }
      case 'shades': {
        const y = (p.species === 'frog' ? headY - 8 : headY) - 1;
        px(headX - 9, y, 7, 3, '#1f1d22');
        px(headX + 2, y, 7, 3, '#1f1d22');
        px(headX - 2, y, 4, 1, '#1f1d22');
        px(headX - 8, y, 2, 1, '#6c6a72'); px(headX + 3, y, 2, 1, '#6c6a72');
        break;
      }
      case 'headphones':
        g.strokeStyle = '#3a3740';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(headX, headY - 1, 12, 11, 0, Math.PI * 1.05, Math.PI * 1.95);
        g.stroke();
        px(headX - 14, headY - 3, 4, 6, '#ef7861');
        px(headX + 11, headY - 3, 4, 6, '#ef7861');
        break;
      case 'flower':
        [[0, -2], [2, 0], [0, 2], [-2, 0]].forEach(([dx, dy]) => ellipse(headX - 8 + dx, top + 2 + dy, 1.6, 1.6, '#f5a3c0'));
        px(headX - 9, top + 1, 2, 2, '#f4d35e');
        break;
      default:
        break;
    }
  }

  function drawScarf(p, cx, neckY) {
    if (p.accessory !== 'scarf') return;
    px(cx - 8, neckY, 17, 3, '#e2574c');
    px(cx + 3, neckY + 2, 3, 5, '#e2574c');
    px(cx - 6, neckY + 1, 2, 1, '#f7f4ef'); px(cx, neckY + 1, 2, 1, '#f7f4ef'); px(cx + 5, neckY + 1, 2, 1, '#f7f4ef');
  }

  function drawProp(p, pose, cx, bodyY) {
    const ink = '#2a2228';
    switch (pose.prop) {
      case 'laptop': {
        const glow = pose.frame % 2 ? tint(p.accent, 0.4) : '#bfe3ff';
        px(cx - 9, bodyY - 1, 18, 9, '#4a4650');
        px(cx - 8, bodyY, 16, 7, glow);
        px(cx - 6, bodyY + 2, 4 + (pose.frame % 3) * 2, 1, '#5b8def');
        px(cx - 6, bodyY + 4, 8 - (pose.frame % 2) * 3, 1, '#5b8def');
        px(cx - 11, bodyY + 8, 22, 2, '#6c6a72');
        break;
      }
      case 'magnifier': {
        const sway = [0, -1, -1, 0, 1, 1][pose.frame % 6];
        g.strokeStyle = '#6c5a3e';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(cx + 12 + sway, bodyY - 8, 4, 4, 0, 0, Math.PI * 2);
        g.stroke();
        px(cx + 11 + sway, bodyY - 9, 2, 2, 'rgba(190,230,255,.9)');
        px(cx + 9 + sway, bodyY - 3, 2, 4, '#6c5a3e');
        break;
      }
      case 'zzz': {
        const rise = pose.frame % 6;
        const letters = [[cx + 12, 14 - rise], [cx + 16, 9 - rise], [cx + 19, 4 - rise]];
        letters.slice(0, 1 + Math.floor(rise / 2)).forEach(([x, y], index) => {
          const size = 2 + index;
          px(x, y, size, 1, '#8e8982'); px(x + size - 1 - Math.floor(size / 2), y + 1, 1, Math.max(size - 2, 1), '#8e8982'); px(x, y + size - 1, size, 1, '#8e8982');
        });
        break;
      }
      case 'sweat':
        px(cx + 11, 14 + (pose.frame % 4) * 2, 2, 3, '#7cc4f2');
        px(cx + 11, 14 + (pose.frame % 4) * 2, 1, 1, '#d7f0ff');
        break;
      case 'sparkle':
        [[cx - 16, 10], [cx + 15, 8], [cx + 18, 20]].forEach(([x, y], index) => {
          if ((pose.frame + index) % 2) return;
          px(x, y - 1, 1, 3, '#e7bc55'); px(x - 1, y, 3, 1, '#e7bc55');
        });
        break;
      case 'dust':
        if (pose.frame % 4 === 0) { px(cx - 14, 46, 2, 2, '#d8d0c4'); px(cx - 17, 45, 1, 1, '#d8d0c4'); }
        break;
      default:
        break;
    }
    return ink;
  }

  /**
   * Draw a single 48×52 frame. `pose` describes how the creature is posed:
   * dx/dy offsets, squash, eyes, mouth, arms, legs, props.
   */
  function drawFrame(p, pose) {
    g.clearRect(0, 0, GRID_W, GRID_H);
    const cx = 24 + (pose.dx || 0);
    const ground = 48;
    const lift = pose.dy || 0;
    const squash = pose.squash || 0;
    const floaty = p.species === 'ghost' ? -2 + Math.round(Math.sin((pose.frame || 0) / 1.5)) : 0;
    const bodyY = ground - 8 + lift + floaty + Math.max(squash, 0);
    const headX = cx + (pose.lean || 0);
    const headY = bodyY - 15 + Math.max(squash, 0) + (pose.droop ? 1 : 0);
    const outline = shade(p.body, isDark(p.body) ? 0.2 : 0.55);

    // Back layer: tails and wings.
    drawBack(p, pose, cx, bodyY);
    drawEars(p, headX, headY, pose);
    drawDogEars(p, headX, headY, pose);

    // Feet and legs.
    const legSwing = pose.legs || 0;
    if (!['ghost', 'slime'].includes(p.species)) {
      const foot = p.species === 'chick' ? '#f39a3c' : shade(p.body, 0.15);
      ellipse(cx - 4 - legSwing, ground - 1 + lift + (legSwing > 0 ? -1 : 0), 3, 2, foot);
      ellipse(cx + 4 + legSwing, ground - 1 + lift + (legSwing < 0 ? -1 : 0), 3, 2, foot);
    }

    // Body.
    if (p.species === 'slime') {
      ellipse(cx, bodyY - 5, 15 + squash, 13 - squash, p.body);
    } else if (p.species === 'ghost') {
      ellipse(cx, bodyY - 1, 10, 9, p.body);
      for (let wave = -8; wave <= 8; wave += 4) {
        ellipse(cx + wave + ((pose.frame || 0) % 2), bodyY + 7, 2.4, 2.4, p.body);
      }
    } else if (p.species === 'robot') {
      g.fillStyle = p.body;
      g.fillRect(cx - 8, bodyY - 6, 16, 13);
    } else {
      ellipse(cx, bodyY, 9 + squash * 0.6, 7 - squash * 0.4, p.body);
    }

    // Arms (drawn as part of the silhouette so they get outlined).
    const arm = p.species === 'robot' ? shade(p.body, 0.1) : p.body;
    const armY = bodyY - 2;
    const left = pose.armL ?? 0;
    const right = pose.armR ?? 0;
    if (p.species !== 'slime') {
      ellipse(cx - 10, armY - left * 5, 2.4, 3, arm);
      ellipse(cx + 10, armY - right * 5, 2.4, 3, arm);
    }

    // Head (merged with the body for slimes).
    if (p.species === 'robot') {
      g.fillStyle = p.body;
      g.beginPath();
      g.roundRect(headX - 12, headY - 10, 24, 20, 4);
      g.fill();
    } else if (p.species !== 'slime') {
      const wide = p.species === 'frog' ? 14 : 12.5;
      ellipse(headX, headY, wide + squash * 0.5, 10.5 - squash * 0.4, p.body);
    }

    drawPattern(p, cx, headX, headY, bodyY);
    crispAndOutline(outline);

    // Face and details on top of the outline.
    const faceY = p.species === 'slime' ? bodyY - 6 : headY;
    drawEyes(p, pose, headX, faceY);
    drawMouth(p, pose, headX, faceY);
    if (p.cheeks && p.species !== 'robot' && pose.eyes !== 'x') {
      const blush = mix(p.body, '#ff6f8a', 0.55);
      px(headX - 9 + (pose.look || 0), faceY + 3, 2, 1, blush);
      px(headX + 8 + (pose.look || 0), faceY + 3, 2, 1, blush);
    }
    if (p.species === 'fox' || p.species === 'dog' || p.species === 'bear') {
      px(headX, faceY + 2, 1, 1, '#2a2228');
    }
    drawScarf(p, cx, bodyY - 7);
    drawAccessory(p, headX, faceY, pose);
    drawProp(p, pose, cx, bodyY);
  }

  // Poses for every frame of every Codex row.
  function posesFor(rowKey, frames) {
    const list = [];
    for (let f = 0; f < frames; f += 1) {
      const base = { frame: f, eyes: 'open', mouth: 'smile' };
      switch (rowKey) {
        case 'idle':
          list.push({ ...base, squash: [0, 0, 1, 1, 0, 0][f], eyes: f === 4 ? 'closed' : 'open', tail: [0, 1, 1, 0, -1, -1][f] });
          break;
        case 'run-right':
        case 'run-left':
          list.push({
            ...base,
            dy: [0, -1, -2, -1, 0, -1, -2, -1][f],
            legs: [2, 1, 0, -1, -2, -1, 0, 1][f],
            armL: f % 4 < 2 ? 0.4 : 0,
            armR: f % 4 < 2 ? 0 : 0.4,
            lean: 1,
            look: 2,
            tail: f % 2 ? 1 : -1,
            mouth: 'open',
            prop: 'dust'
          });
          break;
        case 'wave':
          list.push({ ...base, eyes: 'happy', mouth: 'open', armR: 1.4, armL: 0, dx: 0, lean: f % 2 ? 1 : 0, tail: f % 2 ? 1 : -1, prop: 'sparkle' });
          break;
        case 'jump':
          list.push({
            ...base,
            dy: [0, -6, -10, -6, 0][f],
            squash: [2, -1, -1, -1, 2][f],
            eyes: f === 0 || f === 4 ? 'happy' : 'open',
            mouth: 'open',
            armL: f && f < 4 ? 1.2 : 0,
            armR: f && f < 4 ? 1.2 : 0,
            legs: f && f < 4 ? 1 : 0,
            prop: f === 2 ? 'sparkle' : undefined
          });
          break;
        case 'failed':
          list.push({
            ...base,
            dx: [0, -1, 1, -1, 1, 0, 0, 0][f],
            eyes: f < 4 ? 'x' : 'closed',
            mouth: 'sad',
            droop: f >= 4,
            squash: f >= 4 ? 1 : 0,
            prop: 'sweat'
          });
          break;
        case 'wait':
          list.push({ ...base, eyes: 'closed', mouth: 'o', squash: [0, 1, 1, 0, 0, 1][f], lean: [0, 0, 1, 1, 0, 0][f], prop: 'zzz' });
          break;
        case 'work':
          list.push({ ...base, eyes: 'down', mouth: f % 3 ? 'flat' : 'smile', armL: f % 2 ? 0.3 : 0, armR: f % 2 ? 0 : 0.3, prop: 'laptop' });
          break;
        case 'review':
          list.push({ ...base, look: [-2, -2, 0, 2, 2, 0][f], mouth: f === 5 ? 'smile' : 'flat', armR: 1, prop: 'magnifier' });
          break;
        default:
          list.push(base);
      }
    }
    return list;
  }

  function renderAtlas(p) {
    const atlas = document.createElement('canvas');
    atlas.width = CELL_W * 8;
    atlas.height = CELL_H * ROWS.length;
    const context = atlas.getContext('2d');
    context.imageSmoothingEnabled = false;
    ROWS.forEach((row, rowIndex) => {
      posesFor(row.key, row.frames).forEach((pose, column) => {
        drawFrame(p, pose);
        const x = column * CELL_W;
        const y = rowIndex * CELL_H;
        if (row.key === 'run-left') {
          context.save();
          context.translate(x + CELL_W, y);
          context.scale(-1, 1);
          context.drawImage(grid, 0, 0, GRID_W, GRID_H, 0, 0, GRID_W * SCALE, GRID_H * SCALE);
          context.restore();
        } else {
          context.drawImage(grid, 0, 0, GRID_W, GRID_H, x, y, GRID_W * SCALE, GRID_H * SCALE);
        }
      });
    });
    return atlas;
  }

  // ── Description parsing ──────────────────────────────────────────────────
  function findKey(table, words) {
    return Object.keys(table).find(key => table[key].words.some(word => words.has(word)));
  }

  function parseDescription(text) {
    const words = new Set(String(text).toLowerCase().match(/[a-z]+/g) || []);
    const colors = (String(text).toLowerCase().match(/[a-z]+/g) || []).filter(word => COLORS[word]);
    const result = {};
    const species = findKey(SPECIES, words);
    if (species) result.species = species;
    const pattern = findKey(PATTERNS, words);
    if (pattern) result.pattern = pattern;
    // Prefer the most specific accessory word ("sunglasses" over "glasses").
    const accessory = ['shades', ...Object.keys(ACCESSORIES)].find(key => ACCESSORIES[key].words.some(word => words.has(word)));
    if (accessory) result.accessory = accessory;
    if (colors[0]) result.body = COLORS[colors[0]];
    if (colors[1]) result.accent = COLORS[colors[1]];
    else if (colors[0]) result.accent = tint(COLORS[colors[0]], 0.72);
    if (words.has('pastel') || words.has('soft')) result.body = tint(result.body || '#f5a3c0', 0.35);
    return result;
  }

  // ── UI wiring ────────────────────────────────────────────────────────────
  const el = id => document.getElementById(id);
  const params = {
    name: 'Mochi',
    species: 'cat',
    body: '#f2a65a',
    accent: '#fff1dc',
    pattern: 'stripes',
    accessory: 'none',
    cheeks: true
  };
  let imported = null; // { dataUrl } when the user imports their own sheet
  let atlasCanvas = null;
  let previewUrl = null;
  let renderTimer = null;
  let previewState = 'idle';
  let initialized = false;

  function fillSelect(select, table) {
    if (!select) return;
    select.innerHTML = Object.entries(table).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join('');
  }

  function syncControls() {
    el('maker-name').value = params.name;
    el('maker-species').value = params.species;
    el('maker-body').value = params.body;
    el('maker-accent').value = params.accent;
    el('maker-pattern').value = params.pattern;
    el('maker-accessory').value = params.accessory;
  }

  function setPreviewState(stateName) {
    previewState = stateName;
    const art = el('maker-art');
    if (art) art.className = `preview-art maker-art state-${stateName}`;
    document.querySelectorAll('#maker-states [data-maker-state]').forEach(button => {
      button.classList.toggle('active', button.dataset.makerState === stateName);
    });
  }

  function showPreview(url) {
    const art = el('maker-art');
    if (!art) return;
    applyPetArtStyle(art, { src: url, spriteVersion: 1 });
    setPreviewState(previewState);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderNow, 90);
  }

  function renderNow() {
    imported = null;
    el('maker-size').textContent = '1536×1872 · generated';
    atlasCanvas = renderAtlas(params);
    atlasCanvas.toBlob(blob => {
      if (!blob) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      showPreview(previewUrl);
    }, 'image/png');
  }

  function randomName(random) {
    return pick(random, NAME_PARTS) + pick(random, NAME_ENDS);
  }

  function applyPreset(kind) {
    const random = seededRandom(Date.now());
    const preset = kind === 'random'
      ? { bodies: Object.values(COLORS), accessories: Object.keys(ACCESSORIES), patterns: Object.keys(PATTERNS) }
      : PRESETS[kind];
    params.species = pick(random, Object.keys(SPECIES));
    params.body = pick(random, preset.bodies);
    params.accent = kind === 'cool' ? pick(random, ['#62d0e6', '#a8e6cf', '#f4d35e', '#f5a3c0']) : tint(params.body, 0.7);
    params.accessory = pick(random, preset.accessories);
    params.pattern = pick(random, preset.patterns);
    params.cheeks = kind !== 'cool';
    params.name = randomName(random);
    el('maker-prompt').value = '';
    syncControls();
    renderNow();
  }

  function atlasDataUrl() {
    return imported ? imported.dataUrl : atlasCanvas?.toDataURL('image/png');
  }

  async function savePet(event) {
    event.preventDefault();
    const name = (el('maker-name').value || params.name || 'My pet').trim().slice(0, 40);
    const description = (el('maker-prompt').value.trim() || `A handmade ${SPECIES[params.species].label.toLowerCase()} companion`).slice(0, 180);
    if (!IS_NATIVE_APP) {
      downloadPng();
      showToast('Saving to your library needs the Nuzzle Mac app — downloaded the PNG instead.');
      return;
    }
    const button = el('maker-save');
    button.disabled = true;
    try {
      const pet = await invokeNative('save_custom_pet', { name, description, image: atlasDataUrl() });
      await loadUserPets();
      selectCompanion(pet.id);
      playChime('bell');
      showToast(`${name} is saved and now your companion.`, { type: 'done' });
    } catch (error) {
      showToast(`Could not save: ${error}`, { type: 'error', duration: 4200 });
    } finally {
      button.disabled = false;
    }
  }

  function downloadPng() {
    const url = atlasDataUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(el('maker-name').value || 'pet').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-spritesheet.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function importSheet(file) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      showToast('That image is larger than 12 MB.', { type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth !== 1536 || image.naturalHeight !== 1872) {
          showToast(`Sheets must be 1536×1872 (8×9 cells of 192×208). This one is ${image.naturalWidth}×${image.naturalHeight}.`, { type: 'error', duration: 5000 });
          return;
        }
        imported = { dataUrl: reader.result };
        el('maker-size').textContent = '1536×1872 · imported';
        if (!el('maker-name').value) el('maker-name').value = file.name.replace(/\.[a-z]+$/i, '').slice(0, 40);
        showPreview(reader.result);
        showToast('Sheet imported — preview it, then Save & use.');
      };
      image.onerror = () => showToast('Could not read that image.', { type: 'error' });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    fillSelect(el('maker-species'), SPECIES);
    fillSelect(el('maker-pattern'), PATTERNS);
    fillSelect(el('maker-accessory'), ACCESSORIES);
    el('maker-states').innerHTML = PREVIEW_STATES.map(([key, label]) =>
      `<button type="button" class="chip-button" data-maker-state="${key}">${label}</button>`).join('');
    syncControls();
    renderNow();

    el('maker-prompt').addEventListener('input', event => {
      Object.assign(params, parseDescription(event.target.value));
      syncControls();
      scheduleRender();
    });
    [['maker-species', 'species'], ['maker-body', 'body'], ['maker-accent', 'accent'], ['maker-pattern', 'pattern'], ['maker-accessory', 'accessory']]
      .forEach(([id, key]) => el(id).addEventListener('input', event => {
        params[key] = event.target.value;
        scheduleRender();
      }));
    el('maker-name').addEventListener('input', event => { params.name = event.target.value; });
    el('maker-form').addEventListener('submit', savePet);
    el('maker-download').addEventListener('click', downloadPng);
    el('maker-import-btn').addEventListener('click', () => el('maker-import').click());
    el('maker-import').addEventListener('change', event => {
      importSheet(event.target.files?.[0]);
      event.target.value = '';
    });
    document.addEventListener('click', event => {
      const preset = event.target.closest('[data-maker-preset]');
      if (preset) return applyPreset(preset.dataset.makerPreset);
      const stateButton = event.target.closest('[data-maker-state]');
      if (stateButton) setPreviewState(stateButton.dataset.makerState);
    });
    if (!IS_NATIVE_APP) {
      el('maker-save').innerHTML = '<span>↓</span> Download sheet';
      el('maker-download').hidden = true;
      el('maker-note').textContent = 'In the browser preview, sheets download as PNG. The Mac app saves them straight into ~/.codex/pets.';
    }
  }

  // Build lazily the first time the view opens so startup stays fast.
  document.addEventListener('nuzzle:view', event => {
    if (event.detail === 'maker') init();
  });

  window.nuzzle = window.nuzzle || {};
  window.nuzzle.maker = { renderAtlas, parseDescription, ROWS };
})();
