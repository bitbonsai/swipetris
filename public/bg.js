// ambient background: blurred tetrominoes drifting down, barely there
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const COLORS = { I: "#22d3ee", O: "#facc15", T: "#a855f7", S: "#4ade80", Z: "#f87171", J: "#3b82f6", L: "#fb923c" };

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const bg = document.createElement("div");
  bg.className = "tetris-bg";
  bg.setAttribute("aria-hidden", "true");
  const types = Object.keys(SHAPES);
  for (let i = 0; i < 14; i++) {
    const t = types[i % types.length];
    const p = document.createElement("div");
    p.className = "bg-piece";
    p.style.setProperty("--cell", 14 + Math.random() * 20 + "px");
    p.style.setProperty("--x", Math.random() * 96 + "%");
    p.style.setProperty("--dur", 20 + Math.random() * 25 + "s");
    p.style.setProperty("--delay", -Math.random() * 40 + "s");
    p.style.setProperty("--rot", (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 300) + "deg");
    p.style.setProperty("--col", COLORS[t]);
    for (const [x, y] of SHAPES[t]) {
      const c = document.createElement("i");
      c.style.gridColumn = x + 1;
      c.style.gridRow = y + 1;
      p.appendChild(c);
    }
    bg.appendChild(p);
  }
  document.body.appendChild(bg);
}
