import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// ---------- constants ----------
const COLS = 10;
const ROWS = 20;
const HIDDEN = 2; // buffer rows above visible board
const TOTAL = ROWS + HIDDEN;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
};
const TYPES = Object.keys(SHAPES);

// ---------- themes ----------
export const THEMES = {
  colorful: {
    label: "Colorful",
    colors: { I: 0x22d3ee, O: 0xfacc15, T: 0xa855f7, S: 0x4ade80, Z: 0xf87171, J: 0x3b82f6, L: 0xfb923c },
    bg: 0x0f1115,
    grid: 0x2a2f3a,
    accent: 0x22d3ee,
    css: "theme-colorful",
  },
  pastels: {
    label: "Pastels",
    colors: { I: 0x7fd0d0, O: 0xf5d375, T: 0xc9a3e8, S: 0x93d9a3, Z: 0xef9f9f, J: 0x92b9ec, L: 0xf0bb8a },
    bg: 0xf6f2ec,
    grid: 0xd8cfc0,
    accent: 0xe8875a,
    keyIntensity: 1.0, // dark-theme lighting overexposes pale colors
    blockEmissive: 0.34,
    css: "theme-pastels",
  },
  catppuccin: {
    label: "Catppuccin",
    colors: { I: 0x89dceb, O: 0xf9e2af, T: 0xcba6f7, S: 0xa6e3a1, Z: 0xf38ba8, J: 0x89b4fa, L: 0xfab387 },
    bg: 0x1e1e2e,
    grid: 0x313244,
    accent: 0xcba6f7,
    css: "theme-catppuccin",
  },
  crt: {
    label: "CRT",
    colors: { I: 0x66ff99, O: 0x4dff88, T: 0x39ff70, S: 0x33e666, Z: 0x2bd95c, J: 0x57f28a, L: 0x46e07a },
    bg: 0x051008,
    grid: 0x0d2b16,
    accent: 0x33ff66,
    css: "theme-crt",
  },
};
let theme = THEMES.colorful;
let baseGridColor, accentColor;
export function setTheme(name) {
  theme = THEMES[name] ?? THEMES.colorful;
  document.body.className = theme.css;
  // expose piece colors to CSS (menu title letters, buttons)
  for (const [k, v] of Object.entries(theme.colors))
    document.documentElement.style.setProperty(`--c-${k}`, "#" + v.toString(16).padStart(6, "0"));
  baseGridColor = new THREE.Color(theme.grid);
  accentColor = new THREE.Color(theme.accent);
  invalidateMaterials();
  if (scene) {
    scene.background = new THREE.Color(theme.bg);
    if (scene.userData.rim) scene.userData.rim.color.setHex(theme.accent);
    if (scene.userData.key) scene.userData.key.intensity = theme.keyIntensity ?? 1.6;
    syncMeshes();
    drawNext();
  }
  drawLogo();
}

// ---------- rng ----------
function mulberry32(a) {
  const random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  random.state = () => a;
  return random;
}
export function dailySeed(date = new Date()) {
  // local date, so the daily rolls over at the player's midnight
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

// ---------- audio (synthesized, no assets) ----------
let audioCtx = null;
let muted = localStorage.getItem("swipetris-muted") === "1";
export function setMuted(v) {
  muted = v;
  localStorage.setItem("swipetris-muted", v ? "1" : "0");
}
function tone(freq, dur = 0.06, type = "square", gain = 0.04, delay = 0) {
  if (muted) return;
  try {
    audioCtx ??= new (window.AudioContext ?? window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime + delay;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}
const sfx = {
  move: () => tone(240, 0.03, "square", 0.018),
  rotate: () => tone(330, 0.05, "square", 0.03),
  lock: () => tone(140, 0.08, "triangle", 0.05),
  drop: () => tone(110, 0.09, "triangle", 0.06),
  clear: (n) => {
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i <= Math.min(n, 3); i++) tone(notes[i], 0.09, "square", 0.04, i * 0.07);
  },
  over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.13, "triangle", 0.05, i * 0.13)),
  levelup: () => [330, 415, 494, 659].forEach((f, i) => tone(f, 0.08, "square", 0.035, i * 0.06)),
};
function buzz(ms) {
  try { navigator.vibrate?.(ms); } catch {}
}

// space-invaders heartbeat: every gravity step thumps, pitched per piece,
// alternating two tones; it naturally speeds up with the level
const HEART = { I: 110, O: 98, T: 104, S: 92, Z: 88, J: 82, L: 118 };
let heartFlip = false;
function heartbeat(type) {
  heartFlip = !heartFlip;
  tone((HEART[type] ?? 100) * (heartFlip ? 1 : 0.84), 0.07, "triangle", 0.05);
}

// ---------- game state ----------
let board, current, nextType, bag, rng, mode, seed;
let score, lines, level, pieces, gameOver;
let dropAcc = 0, lastTick = 0, running = false;
const LOCK_DELAY = 300;
const RUN_KEY = "swipetris-run-v1";
let lockAt = 0, lockResets = 0;
let paused = false;
let elapsedMs = 0, activeStartedAt = 0, saveTimer = null;
let botMode = false, botTimer = null, botScoreLimit = Infinity, botRetiring = false;

function activeDuration() {
  return elapsedMs + (running && !paused ? Date.now() - activeStartedAt : 0);
}

export function setPaused(v) {
  if (paused === v) return;
  const now = Date.now(), perfNow = performance.now();
  if (running && v) elapsedMs += now - activeStartedAt;
  paused = v;
  document.getElementById("game-wrap")?.classList.toggle("game-paused", paused);
  if (running && !v) {
    activeStartedAt = now;
    if (lockAt) lockAt = perfNow; // don't insta-lock after resume
    dropAcc = 0;
  }
  if (clearing?.pausedAt && !v) {
    clearing.start += perfNow - clearing.pausedAt;
    clearing.pausedAt = 0;
  } else if (clearing && v) {
    clearing.pausedAt = perfNow;
  }
  if (quake?.pausedAt && !v) {
    quake.start += perfNow - quake.pausedAt;
    quake.pausedAt = 0;
  } else if (quake && v) {
    quake.pausedAt = perfNow;
  }
  if (effectPausedAt && !v) {
    const pauseMs = perfNow - effectPausedAt;
    if (shockwaveStart) shockwaveStart += pauseMs;
    for (const fall of fallingMeshes) fall.start += pauseMs;
  }
  effectPausedAt = v ? perfNow : 0;
  if (v) saveRun();
}

function validPiece(piece) {
  return piece === null || (piece && TYPES.includes(piece.type) &&
    Number.isInteger(piece.rot) && piece.rot >= 0 && piece.rot < 4 &&
    Number.isInteger(piece.x) && Number.isInteger(piece.y));
}

function readSavedRun() {
  try {
    const saved = JSON.parse(localStorage.getItem(RUN_KEY));
    const validBoard = Array.isArray(saved?.board) && saved.board.length === TOTAL &&
      saved.board.every((row) => Array.isArray(row) && row.length === COLS &&
        row.every((cell) => cell === 0 || TYPES.includes(cell)));
    if (saved?.v !== 1 || saved.seed !== dailySeed() || !validBoard ||
        !validPiece(saved.current) || !TYPES.includes(saved.nextType) ||
        !Array.isArray(saved.bag) || !saved.bag.every((type) => TYPES.includes(type)) ||
        !Number.isInteger(saved.rngState) || !["score", "lines", "level", "pieces", "elapsedMs"].every((key) =>
          Number.isFinite(saved[key]) && saved[key] >= 0) ||
        (saved.pendingRows !== null && (!Array.isArray(saved.pendingRows) ||
          !saved.pendingRows.every((row) => Number.isInteger(row) && row >= 0 && row < TOTAL)))) throw new Error("invalid run");
    return saved;
  } catch {
    localStorage.removeItem(RUN_KEY);
    return null;
  }
}

export function getSavedRun() {
  const saved = readSavedRun();
  return saved ? { score: saved.score, lines: saved.lines, level: saved.level, savedAt: saved.savedAt } : null;
}

export function clearSavedRun() {
  clearTimeout(saveTimer);
  saveTimer = null;
  localStorage.removeItem(RUN_KEY);
}

function runSnapshot() {
  const before = clearing?.before;
  return {
    v: 1,
    seed,
    mode,
    board: (before?.board ?? board).map((row) => [...row]),
    current: clearing ? null : (current ? { ...current } : null),
    nextType,
    bag: [...bag],
    rngState: rng.state(),
    score: before?.score ?? score,
    lines: before?.lines ?? lines,
    level: before?.level ?? level,
    pieces,
    elapsedMs: activeDuration(),
    pendingRows: clearing ? [...clearing.rows] : null,
    savedAt: Date.now(),
  };
}

export function saveRun() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!running || gameOver || botMode || !board || !rng) return null;
  const snapshot = runSnapshot();
  try { localStorage.setItem(RUN_KEY, JSON.stringify(snapshot)); } catch {}
  return snapshot;
}

function queueSave() {
  if (botMode || !running) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveRun, 120);
}

export function resumeSavedRun() {
  const saved = readSavedRun();
  if (!saved) return false;
  clearVisualEffects();
  mode = saved.mode;
  seed = saved.seed;
  board = saved.board.map((row) => [...row]);
  current = saved.current ? { ...saved.current } : null;
  nextType = saved.nextType;
  bag = [...saved.bag];
  rng = mulberry32(saved.rngState);
  score = saved.score; lines = saved.lines; level = saved.level; pieces = saved.pieces;
  elapsedMs = saved.elapsedMs; activeStartedAt = Date.now();
  gameOver = false; botMode = false; botRetiring = false; running = true; paused = true;
  lockAt = 0; lockResets = 0; dropAcc = 0; lastTick = performance.now(); clearing = null;
  document.getElementById("game-wrap")?.classList.add("game-paused");
  syncMeshes();
  drawNext();
  emitStats();
  if (saved.pendingRows?.length) startClearAnim(saved.pendingRows);
  return true;
}

function dailyOpeningType(date = new Date()) {
  // Cycle the opening piece by calendar day, so consecutive dailies never
  // look identical from the current + next pieces shown at launch.
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return TYPES[((day % TYPES.length) + TYPES.length) % TYPES.length];
}
function freshBag(openingType) {
  const b = [...TYPES];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  if (openingType) {
    const i = b.indexOf(openingType);
    [b[i], b[b.length - 1]] = [b[b.length - 1], b[i]]; // takeType() pops first
  }
  return b;
}
function takeType() {
  if (bag.length === 0) bag = freshBag();
  return bag.pop();
}
function matrixOf(p) {
  let m = SHAPES[p.type];
  for (let i = 0; i < p.rot; i++) m = rotateCW(m);
  return m;
}
function rotateCW(m) {
  const n = m.length;
  return m[0].map((_, i) => m.map((row) => row[i]).reverse());
}
function collides(m, px, py) {
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const bx = px + x, by = py + y;
      if (bx < 0 || bx >= COLS || by >= TOTAL) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  return false;
}
function spawn() {
  current = { type: nextType, rot: 0, x: 0, y: 0 };
  lockAt = 0;
  lockResets = 0;
  nextType = takeType();
  current.x = current.type === "O" ? 4 : 3;
  current.y = 0;
  if (collides(matrixOf(current), current.x, current.y)) {
    endGame();
  }
  drawNext();
  syncMeshes();
  if (botMode) queueBotTurn();
}
function resetLockDelay() {
  if (lockAt && lockResets < 8) {
    lockAt = performance.now();
    lockResets++;
  }
}
function move(dx) {
  if (!running || !current || paused) return;
  const m = matrixOf(current);
  if (!collides(m, current.x + dx, current.y)) {
    current.x += dx;
    resetLockDelay();
    sfx.move();
    syncMeshes();
    queueSave();
  }
}
function rotate() {
  if (!running || !current || paused) return;
  const m = rotateCW(matrixOf(current));
  for (const kick of [0, 1, -1, 2, -2]) {
    if (!collides(m, current.x + kick, current.y)) {
      current.rot = (current.rot + 1) % 4;
      current.x += kick;
      resetLockDelay();
      sfx.rotate();
      syncMeshes();
      queueSave();
      return;
    }
  }
}
function softDropStep() {
  if (!running || !current || paused) return false;
  const m = matrixOf(current);
  if (!collides(m, current.x, current.y + 1)) {
    current.y += 1;
    score += 1;
    heartbeat(current.type);
    syncMeshes();
    emitStats();
    queueSave();
    return true;
  }
  return false; // grounded; lock delay takes over
}
function hardDrop() {
  if (!running || !current || paused) return;
  const m = matrixOf(current);
  let d = 0;
  while (!collides(m, current.x, current.y + 1)) { current.y++; d++; }
  score += d * 2;
  sfx.drop();
  buzz(15);
  lockPiece(true);
}

// Bot evaluates every legal rotation and column. Favor clears, avoid holes and tall, jagged stacks.
function collidesOn(candidate, m, px, py) {
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const bx = px + x, by = py + y;
      if (bx < 0 || bx >= COLS || by >= TOTAL) return true;
      if (by >= 0 && candidate[by][bx]) return true;
    }
  return false;
}
function ratePlacement(m, x) {
  let y = current.y;
  if (collidesOn(board, m, x, y)) return null;
  while (!collidesOn(board, m, x, y + 1)) y++;
  const next = board.map((row) => [...row]);
  for (let py = 0; py < m.length; py++)
    for (let px = 0; px < m[py].length; px++)
      if (m[py][px] && y + py >= 0) next[y + py][x + px] = current.type;

  let clears = 0;
  const kept = [];
  for (const row of next) {
    if (row.every(Boolean)) clears++;
    else kept.push(row);
  }
  while (kept.length < TOTAL) kept.unshift(new Array(COLS).fill(0));

  const heights = [];
  let holes = 0;
  for (let col = 0; col < COLS; col++) {
    let top = TOTAL, seenBlock = false;
    for (let row = 0; row < TOTAL; row++) {
      if (kept[row][col]) { seenBlock = true; top = Math.min(top, row); }
      else if (seenBlock) holes++;
    }
    heights.push(top === TOTAL ? 0 : TOTAL - top);
  }
  const aggregate = heights.reduce((sum, h) => sum + h, 0);
  const bumpiness = heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0);
  const maxHeight = Math.max(...heights);
  const dropPoints = (y - current.y) * 2;
  const clearPoints = [0, 100, 300, 500, 800][clears] * level;
  return {
    x,
    clears,
    aggregate,
    maxHeight,
    score: clears * 10 - holes * 8 - aggregate * 0.45 - bumpiness * 0.8 - maxHeight * 1.2,
    projectedScore: score + dropPoints + clearPoints,
  };
}
function chooseBotMove() {
  const seen = new Set();
  let m = SHAPES[current.type], best = null;
  for (let rotations = 0; rotations < 4; rotations++) {
    const key = m.map((row) => row.join("")).join("/");
    if (!seen.has(key)) {
      seen.add(key);
      let minX = m[0].length, maxX = -1;
      for (let y = 0; y < m.length; y++)
        for (let x = 0; x < m[y].length; x++)
          if (m[y][x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      for (let x = -minX; x <= COLS - 1 - maxX; x++) {
        const candidate = ratePlacement(m, x);
        if (candidate && candidate.projectedScore <= botScoreLimit && (!best || candidate.score > best.score)) {
          best = { ...candidate, rotations };
        }
      }
    }
    m = rotateCW(m);
  }
  return best;
}
function chooseBotRetirementMove() {
  const seen = new Set();
  let m = SHAPES[current.type], best = null;
  for (let rotations = 0; rotations < 4; rotations++) {
    const key = m.map((row) => row.join("")).join("/");
    if (!seen.has(key)) {
      seen.add(key);
      let minX = m[0].length, maxX = -1;
      for (let y = 0; y < m.length; y++)
        for (let x = 0; x < m[y].length; x++)
          if (m[y][x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      for (let x = -minX; x <= COLS - 1 - maxX; x++) {
        const candidate = ratePlacement(m, x);
        if (candidate && candidate.clears === 0 && (!best || candidate.aggregate > best.aggregate || (candidate.aggregate === best.aggregate && candidate.maxHeight > best.maxHeight))) {
          best = { ...candidate, rotations };
        }
      }
    }
    m = rotateCW(m);
  }
  return best;
}
function botRetireDrop() {
  const step = () => {
    if (!botMode || !running || !current) return;
    if (paused) { botTimer = setTimeout(step, 100); return; }
    const m = matrixOf(current);
    if (!collides(m, current.x, current.y + 1)) {
      current.y++;
      syncMeshes();
      botTimer = setTimeout(step, 65);
    } else {
      lockPiece(true);
    }
  };
  step();
}
function queueBotTurn() {
  clearTimeout(botTimer);
  if (!botMode || !running || !current) return;
  botTimer = setTimeout(() => {
    let plan = botRetiring ? chooseBotRetirementMove() : chooseBotMove();
    if (!plan && !botRetiring) {
      botRetiring = true;
      plan = chooseBotRetirementMove();
    }
    if (!plan || !current) { endGame(); return; }
    let remainingRotations = plan.rotations;
    const act = () => {
      if (!botMode || !running || !current) return;
      if (paused) { botTimer = setTimeout(act, 100); return; }
      if (remainingRotations > 0) {
        rotate();
        remainingRotations--;
        botTimer = setTimeout(act, 60);
      } else if (current.x !== plan.x) {
        const before = current.x;
        move(plan.x > current.x ? 1 : -1);
        if (current.x === before) botRetiring ? botRetireDrop() : hardDrop();
        else botTimer = setTimeout(act, 45);
      } else if (botRetiring) {
        botRetireDrop();
      } else {
        hardDrop();
      }
    };
    act();
  }, 180);
}
function ghostY() {
  const m = matrixOf(current);
  let y = current.y;
  while (!collides(m, current.x, y + 1)) y++;
  return y;
}
function lockPiece(slam = false) {
  const m = matrixOf(current);
  let topOut = false;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const by = current.y + y, bx = current.x + x;
      if (by < HIDDEN) topOut = true;
      if (by >= 0) board[by][bx] = current.type;
    }
  pieces++;
  if (slam) shake(0.8);
  else { sfx.lock(); buzz(10); }
  const fullRows = [];
  for (let y = 0; y < TOTAL; y++) if (board[y].every((c) => c)) fullRows.push(y);
  emitStats();
  if (topOut) { endGame(); return; }
  if (fullRows.length) {
    // Hold the next piece until the clear and its celebration finish.
    current = null;
    syncMeshes();
    startClearAnim(fullRows);
  } else {
    spawn();
    queueSave();
  }
}

// ---------- line-clear celebrations ----------
const CLEAR_TIMINGS = {
  1: { collapse: 140, total: 420 },
  2: { collapse: 150, total: 1050 },
  3: { collapse: 165, total: 1500 },
  4: { collapse: 180, total: 2400 },
};
let clearing = null;

function clearTiming(count) {
  if (!reducedMotion.matches) return CLEAR_TIMINGS[count];
  return count === 1 ? { collapse: 180, total: 360 } : { collapse: 190, total: 650 + count * 100 };
}

function startClearAnim(rows) {
  const ys = new Set(rows.map((y) => TOTAL - 1 - y + 0.5));
  const meshes = [];
  const sortedWorldRows = [...ys].sort((a, b) => a - b);
  for (const mesh of boardGroup.children)
    if (mesh.visible && ys.has(mesh.position.y)) {
      const clearMaterial = new THREE.MeshBasicMaterial({ color: mesh.material.color });
      mesh.geometry = clearPlaneGeo;
      mesh.material = clearMaterial;
      meshes.push({
        mesh,
        material: clearMaterial,
        delay: reducedMotion.matches ? 0 : sortedWorldRows.indexOf(mesh.position.y) * 12,
        duration: reducedMotion.matches ? 180 : 125,
      });
    }
  const timing = clearTiming(rows.length);
  clearing = {
    rows: [...rows], start: performance.now(), meshes, ...timing, resolved: false, pausedAt: paused ? performance.now() : 0,
    before: { board: board.map((row) => [...row]), score, lines, level },
  };
  if (rows.length > 1) flash(rows.length);
  queueSave();
}

function resolveClear() {
  if (!clearing || clearing.resolved) return;
  const { rows } = clearing;
  const clearedRows = new Set(rows);
  settleDrops = new Map();
  if (!reducedMotion.matches) {
    for (let y = 0; y < TOTAL; y++) {
      if (clearedRows.has(y)) continue;
      const drop = rows.filter((row) => row > y).length;
      if (!drop) continue;
      for (let x = 0; x < COLS; x++) if (board[y][x]) settleDrops.set(`${x},${y + drop}`, drop);
    }
  }
  // Ascending: splice+unshift shifts indices, so lower rows must go first.
  for (const y of [...rows].sort((a, b) => a - b)) {
    board.splice(y, 1);
    board.unshift(new Array(COLS).fill(0));
  }
  const cleared = rows.length;
  const pts = [0, 100, 300, 500, 800][cleared] * level;
  lines += cleared;
  score += pts;
  const newLevel = Math.floor(lines / 10) + 1;
  if (newLevel > level) sfx.levelup();
  level = newLevel;
  clearing.resolved = true;
  shake(0.9 + cleared * 0.5);
  sfx.clear(cleared);
  buzz(cleared === 4 ? [70, 35, 90] : cleared > 1 ? 60 : 30);

  if (cleared === 1) {
    popText(`+${pts}`);
  } else {
    const label = ["", "", "DOUBLE!", "TRIPLE!", "TETRIS!"][cleared];
    popText(label, `big clear-callout clear-${cleared}`, clearing.total - clearing.collapse);
    shockwaveStart = performance.now();
    if (cleared === 2) quake = { start: performance.now(), duration: 260, amp: 0.75 };
    if (cleared === 3) {
      quake = { start: performance.now(), duration: 440, amp: 1.25 };
      burstParticles(rows, 30);
    }
    if (cleared === 4) {
      quake = { start: performance.now(), duration: 1050, amp: 3.7 };
      burstParticles(rows, 76);
      const wrap = document.getElementById("game-wrap");
      wrap?.classList.remove("tetris-impact");
      void wrap?.offsetWidth;
      wrap?.classList.add("tetris-impact");
      setTimeout(() => wrap?.classList.remove("tetris-impact"), 1100);
    }
  }
  for (const clear of clearing.meshes) clear.material.dispose();
  syncMeshes();
  emitStats();
}

function finishClear() {
  if (!clearing) return;
  resolveClear();
  clearing = null;
  dropAcc = 0;
  spawn();
  queueSave();
}
function dropInterval() {
  return Math.max(60, 1000 * Math.pow(0.85, level - 1));
}

// A game keeps its original board until the UI deliberately starts the next daily.
// This lets the PWA notice a local-midnight rollover after it has been left open.
export function hasDailyRolledOver() {
  return mode === "daily" && seed !== dailySeed();
}

export function startGame(isBot = false, scoreLimit = Infinity) {
  clearTimeout(botTimer);
  botMode = isBot;
  botScoreLimit = scoreLimit;
  botRetiring = false;
  mode = "daily";
  seed = dailySeed();
  rng = mulberry32(seed);
  bag = freshBag(dailyOpeningType());
  nextType = takeType();
  board = Array.from({ length: TOTAL }, () => new Array(COLS).fill(0));
  clearing = null;
  score = 0; lines = 0; level = 1; pieces = 0; gameOver = false;
  if (!isBot) clearSavedRun();
  clearVisualEffects();
  elapsedMs = 0; activeStartedAt = Date.now();
  dropAcc = 0; lastTick = performance.now();
  paused = false; running = true;
  document.getElementById("game-wrap")?.classList.remove("game-paused");
  spawn();
  emitStats();
  queueSave();
}
function endGame() {
  const durationMs = activeDuration();
  running = false;
  gameOver = true;
  sfx.over();
  buzz(120);
  const detail = { mode, seed, score, lines, level, pieces, durationMs, bot: botMode };
  if (!botMode) clearSavedRun();
  botMode = false;
  botRetiring = false;
  clearTimeout(botTimer);
  window.dispatchEvent(new CustomEvent("gameover", { detail }));
}
function emitStats() {
  window.dispatchEvent(new CustomEvent("stats", { detail: { score, lines, level } }));
}

// ---------- three.js scene ----------
let scene, camera, renderer, boardGroup, ghostGroup, effectsGroup, gridMat, playGroup;
let gridGeo, gridColorAttr;
const _gridTmpColor = { c: null };
let shakeAmp = 0, quake = null, shockwaveStart = 0, effectPausedAt = 0, settleDrops = null;
const celebrationParticles = [], fallingMeshes = [];
const BASE_CAM_X = COLS / 2, BASE_CAM_Y = ROWS / 2 + 2.5;
let fitZ = 24;

function initScene(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.bg);
  camera = new THREE.PerspectiveCamera(42, COLS / (ROWS + 4), 0.1, 100);
  camera.position.set(BASE_CAM_X, BASE_CAM_Y, 24);
  camera.lookAt(COLS / 2, ROWS / 2 - 0.5, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 3-point lighting: hemisphere fill + key + colored rim
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, theme.keyIntensity ?? 1.6);
  key.position.set(6, 18, 12);
  scene.add(key);
  scene.userData.key = key;
  const rim = new THREE.DirectionalLight(theme.accent, 0.9);
  rim.position.set(-9, 3, -7);
  scene.add(rim);
  scene.userData.rim = rim;

  // grid with vertex colors so a glow band can sweep up the lines
  const pts = [];
  for (let x = 0; x <= COLS; x++) pts.push(x, 0, -0.5, x, ROWS, -0.5);
  for (let y = 0; y <= ROWS; y++) pts.push(0, y, -0.5, COLS, y, -0.5);
  gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  gridColorAttr = new THREE.BufferAttribute(new Float32Array(pts.length), 3);
  gridGeo.setAttribute("color", gridColorAttr);
  gridMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45 });
  _gridTmpColor.c = new THREE.Color();

  // Keep the spawn row below the HUD so the active piece stays visible on a tall stack.
  playGroup = new THREE.Group();
  playGroup.position.y = -1.35;
  playGroup.add(new THREE.LineSegments(gridGeo, gridMat));

  boardGroup = new THREE.Group();
  ghostGroup = new THREE.Group();
  effectsGroup = new THREE.Group();
  playGroup.add(boardGroup, ghostGroup, effectsGroup);
  scene.add(playGroup);

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);
}
function resize() {
  const wrap = document.getElementById("game-wrap");
  if (!wrap || !renderer) return;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // fit board: adjust distance
  const fitH = (ROWS / 2 + 0.25) / Math.tan((camera.fov * Math.PI) / 360);
  const fitW = (COLS / 2 + 0.2) / (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
  fitZ = Math.max(fitH, fitW);
  camera.position.z = fitZ;
  camera.updateProjectionMatrix();
}
const blockGeo = new RoundedBoxGeometry(0.94, 0.94, 0.94, 2, 0.09);
const clearPlaneGeo = new THREE.PlaneGeometry(0.9, 0.9);
const particleGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);

// vertical gradient: bright top -> darker bottom, multiplied with block color
let gradTex = null;
function gradientTexture() {
  if (gradTex) return gradTex;
  const cv = document.createElement("canvas");
  cv.width = 4; cv.height = 64;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, "#d8d8d8");
  g.addColorStop(1, "#7a7a7a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  gradTex = new THREE.CanvasTexture(cv);
  return gradTex;
}
const matCache = new Map();
function material(type, ghost = false) {
  const key = `${type}-${ghost}`;
  if (!matCache.has(key)) {
    const c = theme.colors[type];
    matCache.set(key, new THREE.MeshStandardMaterial({
      color: c, roughness: 0.28, metalness: 0.12,
      map: ghost ? null : gradientTexture(),
      emissive: c, emissiveIntensity: ghost ? 0 : (theme.blockEmissive ?? 0.22),
      transparent: ghost, opacity: ghost ? 0.16 : 1,
    }));
  }
  return matCache.get(key);
}
function invalidateMaterials() { matCache.clear(); }
// pooled meshes: reuse instead of rebuilding every frame (less GC churn on mobile)
function syncGroup(group, blocks) {
  while (group.children.length < blocks.length) group.add(new THREE.Mesh(blockGeo));
  group.children.forEach((mesh, i) => {
    const b = blocks[i];
    for (let j = fallingMeshes.length - 1; j >= 0; j--)
      if (fallingMeshes[j].mesh === mesh) fallingMeshes.splice(j, 1);
    if (b) {
      mesh.visible = true;
      mesh.geometry = blockGeo;
      mesh.scale.setScalar(1);
      mesh.material = material(b.type, b.ghost);
      const targetY = b.y + 0.5;
      mesh.position.set(b.x + 0.5, targetY + (b.drop ?? 0), 0);
      if (b.drop) fallingMeshes.push({
        mesh,
        fromY: targetY + b.drop,
        toY: targetY,
        start: performance.now(),
        duration: 130 + b.drop * 32,
      });
    } else {
      mesh.visible = false;
    }
  });
}
// world y: visible row 0 (bottom) -> 0.5; board index TOTAL-1 -> bottom
function worldY(boardIdx) { return TOTAL - 1 - boardIdx; }

function syncMeshes() {
  if (!boardGroup || !board) return;
  const solid = [], ghost = [];
  for (let y = 0; y < TOTAL; y++)
    for (let x = 0; x < COLS; x++)
      if (board[y][x]) solid.push({ type: board[y][x], x, y: worldY(y), drop: settleDrops?.get(`${x},${y}`) ?? 0 });
  if (running && current) {
    const m = matrixOf(current);
    const gy = ghostY();
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++)
        if (m[y][x]) {
          const wy = worldY(current.y + y);
          if (wy < ROWS) solid.push({ type: current.type, x: current.x + x, y: wy });
          const gwy = worldY(gy + y);
          if (gwy < ROWS) ghost.push({ type: current.type, x: current.x + x, y: gwy, ghost: true });
        }
  }
  syncGroup(boardGroup, solid);
  settleDrops = null;
  syncGroup(ghostGroup, ghost);
}

function clearVisualEffects() {
  while (celebrationParticles.length) {
    const particle = celebrationParticles.pop();
    effectsGroup?.remove(particle.mesh);
    particle.mesh.material.dispose();
  }
  quake = null;
  shockwaveStart = 0;
  settleDrops = null;
  fallingMeshes.length = 0;
  shakeAmp = 0;
  document.getElementById("hud-pops")?.replaceChildren();
  document.getElementById("game-wrap")?.classList.remove("tetris-impact");
}

function burstParticles(rows, count) {
  if (reducedMotion.matches || !effectsGroup) return;
  const tetris = rows.length === 4;
  for (let i = 0; i < count; i++) {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const material = new THREE.MeshBasicMaterial({ color: theme.colors[type], transparent: true });
    const mesh = new THREE.Mesh(particleGeo, material);
    const row = rows[Math.floor(Math.random() * rows.length)];
    mesh.position.set(Math.random() * COLS, worldY(row) + 0.5, 0.3 + Math.random() * 0.8);
    const side = mesh.position.x < COLS / 2 ? -1 : 1;
    effectsGroup.add(mesh);
    celebrationParticles.push({
      mesh, age: 0, life: tetris ? 1.55 + Math.random() * 0.65 : 1 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * (tetris ? 8 : 5) + (tetris ? side * 1.6 : 0),
      vy: 4.5 + Math.random() * (tetris ? 8 : 5),
      vz: (Math.random() - 0.5) * 3,
      spin: (Math.random() - 0.5) * 12,
    });
  }
}

function updateFalls(now) {
  if (paused) return;
  for (let i = fallingMeshes.length - 1; i >= 0; i--) {
    const fall = fallingMeshes[i];
    const k = Math.max(0, Math.min(1, (now - fall.start) / fall.duration));
    fall.mesh.position.y = fall.fromY + (fall.toY - fall.fromY) * k * k;
    if (k >= 1) fallingMeshes.splice(i, 1);
  }
}

function updateParticles(dt) {
  if (paused) return;
  for (let i = celebrationParticles.length - 1; i >= 0; i--) {
    const p = celebrationParticles[i];
    p.age += dt;
    p.vy -= 9 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.rotation.x += p.spin * dt;
    p.mesh.rotation.y += p.spin * 0.7 * dt;
    p.mesh.material.opacity = Math.max(0, 1 - Math.pow(p.age / p.life, 3));
    if (p.age >= p.life) {
      effectsGroup.remove(p.mesh);
      p.mesh.material.dispose();
      celebrationParticles.splice(i, 1);
    }
  }
}

function shake(amp = 1) {
  if (!reducedMotion.matches) shakeAmp = Math.max(shakeAmp, amp);
}

function popText(text, cls = "", duration = 900) {
  const box = document.getElementById("hud-pops");
  if (!box) return;
  const el = document.createElement("span");
  el.className = `hud-pop ${cls}`;
  el.textContent = text;
  el.dataset.text = text;
  el.style.setProperty("--pop-duration", `${duration}ms`);
  box.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

function flash(cleared = 1) {
  const el = document.getElementById("clear-flash");
  if (!el) return;
  el.className = "";
  void el.offsetWidth;
  el.classList.add("on");
  if (cleared === 4) el.classList.add("tetris");
  else if (cleared === 3) el.classList.add("triple");
}

// main loop: gravity + camera shake
function tick(now) {
  requestAnimationFrame(tick);
  const frameDt = Math.min(0.05, Math.max(0, (now - lastTick) / 1000));
  if (clearing && !paused) {
    const elapsed = now - clearing.start;
    if (!clearing.resolved) {
      for (const clear of clearing.meshes) {
        const k = Math.max(0, Math.min(1, (elapsed - clear.delay) / clear.duration));
        const eased = 1 - Math.pow(1 - k, 3);
        clear.mesh.scale.setScalar(Math.max(0.001, 1 - eased));
      }
      if (elapsed >= clearing.collapse) resolveClear();
    }
    if (elapsed >= clearing.total) finishClear();
  }
  if (running && current && !paused) {
    dropAcc += now - lastTick;
    const m = matrixOf(current);
    if (collides(m, current.x, current.y + 1)) {
      // grounded: lock after a grace window instead of instantly
      if (!lockAt) lockAt = now;
      if (now - lockAt >= LOCK_DELAY) {
        lockAt = 0;
        lockPiece();
      }
      if (dropAcc >= dropInterval()) dropAcc = 0;
    } else {
      lockAt = 0;
      if (dropAcc >= dropInterval()) {
        dropAcc = 0;
        current.y += 1;
        heartbeat(current.type);
        syncMeshes();
        queueSave();
      }
    }
  }
  updateFalls(now);
  updateParticles(frameDt);
  lastTick = now;

  // camera shake + zoom punch
  let quakeAmp = 0;
  if (quake && !paused) {
    const k = (now - quake.start) / quake.duration;
    if (k >= 1) quake = null;
    else quakeAmp = quake.amp * Math.pow(1 - Math.max(0, k), 1.7) * (0.72 + 0.28 * Math.sin(now * 0.055));
  }
  if (shakeAmp > 0.02) shakeAmp *= 0.87;
  else shakeAmp = 0;
  const cameraAmp = Math.max(shakeAmp, quakeAmp);
  if (cameraAmp > 0.02) {
    camera.position.x = BASE_CAM_X + (Math.random() - 0.5) * cameraAmp * 0.5;
    camera.position.y = BASE_CAM_Y + (Math.random() - 0.5) * cameraAmp * 0.5;
    camera.position.z = fitZ - cameraAmp * 0.45;
  } else if (camera.position.x !== BASE_CAM_X || camera.position.y !== BASE_CAM_Y || camera.position.z !== fitZ) {
    camera.position.set(BASE_CAM_X, BASE_CAM_Y, fitZ);
  }

  // grid: breathing opacity + glow band sweeping up (horizontal lines light row by row)
  if (gridColorAttr && baseGridColor) {
    gridMat.opacity = 0.42 + 0.08 * Math.sin(now * 0.0011);
    const band = (((now * 0.00028) % 1) * (ROWS + 10)) - 5; // travels bottom -> top with a pause off-board
    let shockY = -10, shockStrength = 0;
    if (shockwaveStart && !paused) {
      const age = now - shockwaveStart;
      if (age > 950) shockwaveStart = 0;
      else {
        shockY = -2 + (age / 950) * (ROWS + 5);
        shockStrength = 1 - age / 950;
      }
    }
    const pos = gridGeo.getAttribute("position");
    const c = _gridTmpColor.c;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.abs(pos.getY(i) - band);
      const k = Math.max(0, 1 - d / 2.4);
      const shock = Math.max(0, 1 - Math.abs(pos.getY(i) - shockY) / 1.6) * shockStrength;
      c.copy(baseGridColor).lerp(accentColor, Math.min(1, 0.1 + 0.55 * k * k + 0.9 * shock));
      gridColorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    gridColorAttr.needsUpdate = true;
  }

  renderer?.render(scene, camera);
}

// ---------- next preview (2d) ----------
function drawNext() {
  const cv = document.getElementById("next-canvas");
  if (!cv || !nextType) return;
  const ctx = cv.getContext("2d");
  const s = cv.width / 4;
  ctx.clearRect(0, 0, cv.width, cv.height);
  const m = SHAPES[nextType];
  const hex = "#" + theme.colors[nextType].toString(16).padStart(6, "0");
  ctx.fillStyle = hex;
  const offX = (4 - m[0].length) / 2, offY = (4 - m.length) / 2;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++)
      if (m[y][x]) ctx.fillRect((offX + x) * s + 1, (offY + y) * s + 1, s - 2, s - 2);
}

// random tetromino logo on menu screen
export function drawLogo() {
  const cv = document.getElementById("logo-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const m = SHAPES[type];
  const s = cv.width / 4;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = "#" + theme.colors[type].toString(16).padStart(6, "0");
  const offX = (4 - m[0].length) / 2, offY = (4 - m.length) / 2;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++)
      if (m[y][x]) {
        const px = (offX + x) * s + 2, py = (offY + y) * s + 2;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(px, py, s - 4, s - 4, 6);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, s - 4, s - 4);
        }
      }
}

// ---------- input ----------
function initInput(el) {
  let start = null, vLock = false, movedX = 0, softDropping = false, lastDropY = 0;
  const cellPx = () => el.clientWidth / COLS;

  el.addEventListener("pointerdown", (e) => {
    // overlays and the settings sheet live inside el; don't steal their clicks
    if (!running || paused || e.target.closest("#sheet, #sheet-backdrop")) return;
    el.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
    vLock = false; movedX = 0; softDropping = false;
  });
  el.addEventListener("pointermove", (e) => {
    if (!start || !running) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    // downward intent: hold the column for the rest of the gesture
    if (!vLock && dy > cellPx() * 0.5 && dy > Math.abs(dx) * 1.4) vLock = true;
    if (!vLock) {
      const cells = Math.trunc(dx / (cellPx() * 0.9));
      if (cells !== movedX) {
        const step = cells > movedX ? 1 : -1;
        while (movedX !== cells) { move(step); movedX += step; }
      }
    }
    // drag down = soft drop, one row per ~0.8 cell of travel
    if (!softDropping && dy > cellPx() * 1.2 && Math.abs(dx) < cellPx()) {
      softDropping = true;
      lastDropY = e.clientY;
    }
    if (softDropping) {
      const stepPx = cellPx() * 0.8;
      while (e.clientY - lastDropY >= stepPx) {
        if (!softDropStep()) break;
        lastDropY += stepPx;
      }
    }
  });
  el.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const dt = performance.now() - start.t;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (running) {
      if (dt < 220 && adx < 12 && ady < 12) rotate();             // tap
      else if (dy < -40 && ady > adx * 1.4 && dt < 350) {
        window.dispatchEvent(new CustomEvent("settings"));         // fast swipe up
      } else if (dy > 40 && ady > adx * 1.4 && dt < 300) hardDrop(); // fast swipe down
    }
    start = null; vLock = false; softDropping = false;
  });
  el.addEventListener("pointercancel", () => { start = null; vLock = false; softDropping = false; });

  window.addEventListener("keydown", (e) => {
    if (!running) return;
    if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowUp" || e.key === "x") rotate();
    else if (e.key === "ArrowDown") softDropStep();
    else if (e.key === " ") { e.preventDefault(); hardDrop(); }
  });
}

// ---------- boot ----------
// desktop affordance: translucent circle cursor with a swoosh tail while swiping
function initCursor(el) {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const dot = document.createElement("div");
  dot.id = "cursor-dot";
  el.appendChild(dot);
  let down = false;
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    if (down) {
      const t = document.createElement("div");
      t.className = "cursor-trail";
      t.style.left = x + "px";
      t.style.top = y + "px";
      el.appendChild(t);
      setTimeout(() => t.remove(), 380);
    }
  });
  el.addEventListener("pointerdown", () => { down = true; dot.classList.add("show", "down"); });
  window.addEventListener("pointerup", () => { down = false; dot.classList.remove("down"); });
  el.addEventListener("pointerenter", () => dot.classList.add("show"));
  el.addEventListener("pointerleave", () => dot.classList.remove("show"));
}

export function boot() {
  initScene(document.getElementById("game-wrap"));
  initInput(document.getElementById("game-wrap"));
  initCursor(document.getElementById("game-wrap"));
  window.addEventListener("themechange", invalidateMaterials);
}
