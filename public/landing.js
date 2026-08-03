// scripted attract-mode demo inside the phone mockup

const COLS = 8, ROWS = 13;
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
};
const FILL_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

const boardEl = document.getElementById("demo-board");
const thumbEl = document.getElementById("demo-thumb");
const popsEl = document.getElementById("demo-pops");
const scoreEl = document.getElementById("demo-score");
const sheetEl = document.getElementById("demo-sheet");
const screenEl = document.querySelector(".screen");

let board, score, cells = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rotateCW(m) {
  return m[0].map((_, i) => m.map((row) => row[i]).reverse());
}
function collides(m, px, py) {
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++) {
      if (!m[y][x]) continue;
      const bx = px + x, by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  return false;
}

function buildGrid() {
  boardEl.innerHTML = "";
  cells = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const d = document.createElement("div");
    d.className = "cell";
    boardEl.appendChild(d);
    cells.push(d);
  }
}

function prefill() {
  board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  const rows = {
    9: [7],
    10: [0, 1, 2, 5, 6, 7],
    11: [0, 1, 2, 5, 6, 7],
    12: [0, 1, 2, 3, 5, 6, 7],
  };
  let c = 0;
  for (const [y, xs] of Object.entries(rows))
    for (const x of xs) board[y][x] = FILL_TYPES[c++ % FILL_TYPES.length];
}

function render(piece) {
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const t = board[y][x];
      cells[y * COLS + x].className = t ? `cell on c-${t}` : "cell";
    }
  if (piece) {
    const m = piece.m;
    // ghost: where the piece would land
    let gy = piece.y;
    while (!collides(m, piece.x, gy + 1)) gy++;
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const by = gy + y, bx = piece.x + x;
        if (by >= 0) cells[by * COLS + bx].className = `cell on ghost c-${piece.type}`;
      }
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const by = piece.y + y, bx = piece.x + x;
        if (by >= 0) cells[by * COLS + bx].className = `cell on c-${piece.type}`;
      }
  }
}

function drawNext(type) {
  const el = document.getElementById("demo-next");
  if (!el) return;
  el.innerHTML = "";
  const m = SHAPES[type];
  el.style.gridTemplateColumns = `repeat(${m[0].length}, 7px)`;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++) {
      const d = document.createElement("i");
      if (m[y][x]) d.className = `on c-${type}`;
      el.appendChild(d);
    }
}

function setScore(n) {
  score = n;
  scoreEl.textContent = String(n).padStart(6, "0");
}

function pop(text, big = false) {
  const el = document.createElement("span");
  el.className = `demo-pop${big ? " big" : ""}`;
  el.textContent = text;
  popsEl.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---- thumb gestures (visual only) ----
function thumbAt(xPct, yPct) {
  thumbEl.style.left = xPct + "%";
  thumbEl.style.top = yPct + "%";
}
async function gestureDrag(fromX, toX) {
  thumbEl.classList.remove("flicking");
  thumbAt(fromX, 62);
  thumbEl.classList.add("show", "press");
  await sleep(200);
  thumbAt(toX, 62);
  await sleep(460);
  thumbEl.classList.remove("show", "press");
  await sleep(160);
}
async function gestureTap() {
  thumbEl.classList.remove("flicking");
  thumbAt(50, 60);
  thumbEl.classList.add("show");
  await sleep(180);
  thumbEl.classList.add("press", "ripple");
  await sleep(220);
  thumbEl.classList.remove("press", "ripple", "show");
  await sleep(140);
}
async function gestureFlick() {
  thumbEl.classList.remove("flicking");
  thumbAt(50, 48);
  thumbEl.classList.add("show", "press");
  await sleep(200);
  thumbEl.classList.add("flicking");
  thumbAt(50, 88);
  await sleep(170);
  thumbEl.classList.remove("show", "press", "flicking");
}

// swipe up, open the mini settings sheet, switch theme, close
async function settingsScene() {
  if (!sheetEl || !screenEl) return;
  thumbEl.classList.remove("flicking");
  thumbAt(50, 90);
  thumbEl.classList.add("show", "press");
  await sleep(240);
  thumbEl.classList.add("flicking");
  thumbAt(50, 45);
  await sleep(220);
  thumbEl.classList.remove("show", "press", "flicking");
  sheetEl.classList.add("show");
  await sleep(750);
  // tap the catppuccin tile
  thumbAt(63, 92);
  thumbEl.classList.add("show");
  await sleep(300);
  thumbEl.classList.add("press", "ripple");
  await sleep(200);
  boardEl.classList.add("theming");
  screenEl.classList.add("dt-cat");
  sheetEl.querySelector(".t-colorful").classList.remove("active");
  sheetEl.querySelector(".t-cat").classList.add("active");
  setTimeout(() => boardEl.classList.remove("theming"), 700);
  thumbEl.classList.remove("press", "ripple");
  await sleep(800);
  // tap above the sheet to dismiss
  thumbAt(50, 30);
  await sleep(320);
  thumbEl.classList.add("press");
  await sleep(160);
  thumbEl.classList.remove("press", "show");
  sheetEl.classList.remove("show");
  await sleep(450);
}

// ---- piece actions ----
async function slideTo(piece, targetX) {
  const step = targetX > piece.x ? 1 : -1;
  while (piece.x !== targetX && !collides(piece.m, piece.x + step, piece.y)) {
    piece.x += step;
    render(piece);
    await sleep(90);
  }
}

async function clearLines() {
  const full = [];
  for (let y = 0; y < ROWS; y++) if (board[y].every((c) => c)) full.push(y);
  if (!full.length) return;
  for (const y of full)
    for (let x = 0; x < COLS; x++) cells[y * COLS + x].classList.add("clearing");
  await sleep(320);
  for (const y of full) {
    board.splice(y, 1);
    board.unshift(new Array(COLS).fill(0));
  }
  const pts = [0, 100, 300, 500][full.length];
  setScore(score + pts);
  pop(full.length > 1 ? "DOUBLE!" : `+${pts}`, full.length > 1);
  render();
}

// plan: { rowIndex: [{g:'drag', to}, {g:'tap'}, {g:'flick'}] }
async function playPiece(type, startX, plan) {
  const piece = { type, m: SHAPES[type], x: startX, y: -SHAPES[type].length };
  for (;;) {
    const acts = plan[piece.y];
    if (acts) {
      for (const a of acts) {
        if (a.g === "drag") {
          const from = ((piece.x + 1) / COLS) * 100;
          const to = ((a.to + 1) / COLS) * 100;
          const gesture = gestureDrag(from, to);
          await sleep(180);
          await slideTo(piece, a.to);
          await gesture;
        } else if (a.g === "tap") {
          const gesture = gestureTap();
          await sleep(220);
          const rm = rotateCW(piece.m);
          if (!collides(rm, piece.x, piece.y)) { piece.m = rm; render(piece); }
          await gesture;
        } else if (a.g === "flick") {
          const gesture = gestureFlick();
          await sleep(230);
          while (!collides(piece.m, piece.x, piece.y + 1)) piece.y++;
          render(piece);
          setScore(score + 24);
          await gesture;
          await lockPiece(piece);
          return;
        }
      }
    }
    if (collides(piece.m, piece.x, piece.y + 1)) { await lockPiece(piece); return; }
    piece.y++;
    render(piece);
    await sleep(240);
  }
}

async function lockPiece(piece) {
  const m = piece.m;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m[y].length; x++)
      if (m[y][x] && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.type;
  render();
  await sleep(160);
  await clearLines();
}

async function attractLoop() {
  for (;;) {
    // reset to the default theme each pass
    screenEl?.classList.remove("dt-cat");
    sheetEl?.querySelector(".t-cat")?.classList.remove("active");
    sheetEl?.querySelector(".t-colorful")?.classList.add("active");
    prefill();
    setScore(0);
    render();
    await sleep(900);

    // S: rotate vertical, slot into the staircase — double line clear
    drawNext("I");
    await playPiece("S", 2, { 2: [{ g: "tap" }], 4: [{ g: "drag", to: 3 }], 6: [{ g: "flick" }] });
    await sleep(500);

    // I: rotate vertical, drop into the single-column well — line clear
    drawNext("T");
    await playPiece("I", 2, { 2: [{ g: "tap" }], 4: [{ g: "drag", to: 4 }], 6: [{ g: "flick" }] });
    await sleep(500);

    // T: rotate, stack flush against the I column
    drawNext("O");
    await playPiece("T", 3, { 1: [{ g: "tap" }], 3: [{ g: "drag", to: 5 }], 5: [{ g: "flick" }] });
    await sleep(400);

    // O: drag to the left wall, stack
    drawNext("S");
    await playPiece("O", 3, { 3: [{ g: "drag", to: 0 }], 6: [{ g: "flick" }] });
    await sleep(600);

    // open settings, switch to the catppuccin theme, keep playing
    await settingsScene();
    drawNext("T");
    await playPiece("S", 2, { 2: [{ g: "tap" }], 5: [{ g: "drag", to: 5 }], 7: [{ g: "flick" }] });

    await sleep(1400);
    boardEl.classList.add("fade");
    await sleep(500);
    boardEl.classList.remove("fade");
  }
}

buildGrid();
prefill();
setScore(0);
render();

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // static preview: board + one resting piece, no animation loop
  board[9][3] = "T"; board[9][4] = "T"; board[9][5] = "T"; board[8][4] = "T";
  render();
} else {
  attractLoop();
}

// real daily top-5 (falls back to the static sample when offline)
async function loadHiscores() {
  const list = document.getElementById("hiscores");
  if (!list) return;
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  let rows;
  try {
    const res = await fetch(`/api/leaderboard?mode=daily&seed=${seed}`);
    if (!res.ok) return;
    rows = (await res.json()).leaderboard.slice(0, 5);
  } catch {
    return;
  }
  list.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const li = document.createElement("li");
    const rk = document.createElement("span");
    rk.className = "rk" + (i < 3 ? ` r${i + 1}` : "");
    rk.textContent = i + 1;
    const nm = document.createElement("span");
    nm.className = "nm";
    const b = document.createElement("b");
    const r = rows[i];
    if (r) {
      nm.textContent = String(r.name).toUpperCase().slice(0, 5);
      b.textContent = r.score.toLocaleString();
    } else if (i === rows.length) {
      nm.textContent = "YOU??";
      b.textContent = "?????";
      b.className = "you";
    } else {
      nm.textContent = "-----";
      b.textContent = "·····";
    }
    li.append(rk, nm, b);
    list.appendChild(li);
  }
}
loadHiscores();

// hide the scroll cue on first scroll
const scrollCue = document.getElementById("scroll-cue");
if (scrollCue) {
  window.addEventListener("scroll", () => scrollCue.classList.add("hide"), { once: true, passive: true });
}
