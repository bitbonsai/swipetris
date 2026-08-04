import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

// ---------- constants ----------
const COLS = 10;
const ROWS = 20;
const HIDDEN = 2; // buffer rows above visible board
const TOTAL = ROWS + HIDDEN;

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
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
// alternating two tones — and it naturally speeds up with the level
const HEART = { I: 110, O: 98, T: 104, S: 92, Z: 88, J: 82, L: 118 };
let heartFlip = false;
function heartbeat(type) {
  heartFlip = !heartFlip;
  tone((HEART[type] ?? 100) * (heartFlip ? 1 : 0.84), 0.07, "triangle", 0.05);
}

// ---------- game state ----------
let board, current, nextType, bag, rng, mode, seed;
let score, lines, level, pieces, startTime, gameOver;
let dropAcc = 0, lastTick = 0, running = false;
const LOCK_DELAY = 300;
let lockAt = 0, lockResets = 0;
let paused = false;
export function setPaused(v) {
  if (paused === v) return;
  paused = v;
  if (running && !v) {
    if (lockAt) lockAt = performance.now(); // don't insta-lock after resume
    dropAcc = 0;
  }
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
    return true;
  }
  return false; // grounded — lock delay takes over
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
    // pause the piece flow, let the cleared rows flash & shrink first
    current = null;
    syncMeshes();
    startClearAnim(fullRows);
  } else {
    spawn();
  }
}

// ---------- line-clear animation (mirrors the landing demo: glow, shrink, pop) ----------
let clearing = null; // { rows, start, meshes }

function startClearAnim(rows) {
  const ys = new Set(rows.map((y) => TOTAL - 1 - y + 0.5));
  const meshes = [];
  for (const mesh of boardGroup.children)
    if (mesh.visible && ys.has(mesh.position.y)) {
      mesh.material = mesh.material.clone(); // detach from cache so the glow stays local
      mesh.material.emissiveIntensity = 0.9;
      meshes.push(mesh);
    }
  clearing = { rows, start: performance.now(), meshes };
  flash();
}

function finishClear() {
  const { rows } = clearing;
  clearing = null;
  // ascending: splice+unshift shifts indices, so lower rows must go first
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
  shake(0.9 + cleared * 0.5);
  sfx.clear(cleared);
  buzz(cleared > 1 ? 60 : 30);
  popText(cleared === 1 ? `+${pts}` : ["", "", "DOUBLE!", "TRIPLE!", "TETRIS!"][cleared], cleared > 1 ? "big" : "");
  emitStats();
  dropAcc = 0;
  spawn();
}
function dropInterval() {
  return Math.max(60, 1000 * Math.pow(0.85, level - 1));
}

// A game keeps its original board until the UI deliberately starts the next daily.
// This lets the PWA notice a local-midnight rollover after it has been left open.
export function hasDailyRolledOver() {
  return mode === "daily" && seed !== dailySeed();
}

export function startGame() {
  mode = "daily";
  seed = dailySeed();
  rng = mulberry32(seed);
  bag = freshBag(dailyOpeningType());
  nextType = takeType();
  board = Array.from({ length: TOTAL }, () => new Array(COLS).fill(0));
  clearing = null;
  score = 0; lines = 0; level = 1; pieces = 0; gameOver = false;
  startTime = Date.now();
  dropAcc = 0; lastTick = performance.now();
  running = true;
  spawn();
  emitStats();
}
function endGame() {
  running = false;
  gameOver = true;
  sfx.over();
  buzz(120);
  const detail = { mode, seed, score, lines, level, pieces, durationMs: Date.now() - startTime };
  window.dispatchEvent(new CustomEvent("gameover", { detail }));
}
function emitStats() {
  window.dispatchEvent(new CustomEvent("stats", { detail: { score, lines, level } }));
}

// ---------- three.js scene ----------
let scene, camera, renderer, boardGroup, ghostGroup, gridMat, playGroup;
let gridGeo, gridColorAttr;
const _gridTmpColor = { c: null };
let shakeAmp = 0;
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

  // grid — vertex colors so a glow band can sweep up the lines
  const pts = [];
  for (let x = 0; x <= COLS; x++) pts.push(x, 0, -0.5, x, ROWS, -0.5);
  for (let y = 0; y <= ROWS; y++) pts.push(0, y, -0.5, COLS, y, -0.5);
  gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  gridColorAttr = new THREE.BufferAttribute(new Float32Array(pts.length), 3);
  gridGeo.setAttribute("color", gridColorAttr);
  gridMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45 });
  _gridTmpColor.c = new THREE.Color();

  // everything board-related lives here; shifted down to reclaim top space for HUD
  playGroup = new THREE.Group();
  playGroup.position.y = -0.9;
  playGroup.add(new THREE.LineSegments(gridGeo, gridMat));

  boardGroup = new THREE.Group();
  ghostGroup = new THREE.Group();
  playGroup.add(boardGroup, ghostGroup);
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
    if (b) {
      mesh.visible = true;
      mesh.scale.setScalar(1);
      mesh.material = material(b.type, b.ghost);
      mesh.position.set(b.x + 0.5, b.y + 0.5, 0);
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
      if (board[y][x]) solid.push({ type: board[y][x], x, y: worldY(y) });
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
  syncGroup(ghostGroup, ghost);
}

function shake(amp = 1) { shakeAmp = Math.max(shakeAmp, amp); }

function popText(text, cls = "") {
  const box = document.getElementById("hud-pops");
  if (!box) return;
  const el = document.createElement("span");
  el.className = `hud-pop ${cls}`;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function flash() {
  const el = document.getElementById("clear-flash");
  if (!el) return;
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
}

// main loop: gravity + camera shake
function tick(now) {
  requestAnimationFrame(tick);
  if (clearing) {
    const k = Math.min(1, (now - clearing.start) / 320);
    for (const mesh of clearing.meshes) mesh.scale.setScalar(Math.max(0.001, 1 - k * k));
    if (k >= 1) finishClear();
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
      }
    }
  }
  lastTick = now;

  // camera shake + zoom punch
  if (shakeAmp > 0.02) {
    shakeAmp *= 0.87;
    camera.position.x = BASE_CAM_X + (Math.random() - 0.5) * shakeAmp * 0.5;
    camera.position.y = BASE_CAM_Y + (Math.random() - 0.5) * shakeAmp * 0.5;
    camera.position.z = fitZ - shakeAmp * 0.45;
  } else if (shakeAmp !== 0) {
    shakeAmp = 0;
    camera.position.set(BASE_CAM_X, BASE_CAM_Y, fitZ);
  }

  // grid: breathing opacity + glow band sweeping up (horizontal lines light row by row)
  if (gridColorAttr && baseGridColor) {
    gridMat.opacity = 0.42 + 0.08 * Math.sin(now * 0.0011);
    const band = (((now * 0.00028) % 1) * (ROWS + 10)) - 5; // travels bottom -> top with a pause off-board
    const pos = gridGeo.getAttribute("position");
    const c = _gridTmpColor.c;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.abs(pos.getY(i) - band);
      const k = Math.max(0, 1 - d / 2.4);
      c.copy(baseGridColor).lerp(accentColor, 0.1 + 0.55 * k * k);
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
  let start = null, movedX = 0, softDropping = false, lastDropY = 0;
  const cellPx = () => el.clientWidth / COLS;

  el.addEventListener("pointerdown", (e) => {
    // overlays and the settings sheet live inside el — don't steal their clicks
    if (!running || paused || e.target.closest("#sheet, #sheet-backdrop")) return;
    el.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
    movedX = 0; softDropping = false;
  });
  el.addEventListener("pointermove", (e) => {
    if (!start || !running) return;
    const dx = e.clientX - start.x;
    const cells = Math.trunc(dx / (cellPx() * 0.9));
    if (cells !== movedX) {
      const step = cells > movedX ? 1 : -1;
      while (movedX !== cells) { move(step); movedX += step; }
    }
    // drag down = soft drop, one row per ~0.8 cell of travel
    if (!softDropping && e.clientY - start.y > cellPx() * 1.2 && Math.abs(dx) < cellPx()) {
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
    start = null; softDropping = false;
  });
  el.addEventListener("pointercancel", () => { start = null; softDropping = false; });

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
