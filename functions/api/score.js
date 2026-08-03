import { db, json } from "./_shared.js";

// mirrors src/server.ts: validation, plausibility, rate limit, dedup-aware rank

const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function validate(b) {
  if (!b || typeof b !== "object") return null;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (name.length < 1 || name.length > 5) return null;
  if (b.mode !== "daily") return null;
  if (!int(b.seed, 0, 99999999)) return null;
  if (!int(b.score, 0, 9_999_999)) return null;
  if (!int(b.lines, 0, 9_999)) return null;
  if (!int(b.level, 1, 99)) return null;
  if (!int(b.pieces, 1, 99_999)) return null;
  if (!int(b.durationMs, 0, 86_400_000)) return null;
  return { name, mode: b.mode, seed: b.seed, score: b.score, lines: b.lines, level: b.level, pieces: b.pieces, durationMs: b.durationMs };
}

function plausible(s) {
  if (s.level !== Math.floor(s.lines / 10) + 1) return false;
  if (s.lines * 10 > s.pieces * 4) return false;
  if (s.score > s.lines * 200 * s.level + s.pieces * 44) return false;
  if (s.durationMs < s.pieces * 50) return false;
  const days = [-1, 0, 1].map((off) => {
    const d = new Date(Date.now() + off * 86_400_000);
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  });
  return days.includes(s.seed);
}

// best-effort per-isolate rate limit
const submits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const slot = submits.get(ip);
  if (!slot || now > slot.resetAt) {
    submits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  slot.count++;
  if (submits.size > 10_000) submits.clear();
  return slot.count > 10;
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (rateLimited(ip)) return json({ error: "slow down" }, 429);
  let body = null;
  try { body = await request.json(); } catch {}
  const s = validate(body);
  if (!s) return json({ error: "invalid score payload" }, 400);
  if (!plausible(s)) return json({ error: "score rejected" }, 422);

  const client = db(env);
  await client.execute({
    sql: "INSERT INTO scores (name, mode, seed, score, lines, level, pieces, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [s.name, s.mode, s.seed, s.score, s.lines, s.level, s.pieces, s.durationMs, Date.now()],
  });
  const r = await client.execute({
    sql: `SELECT count(*) + 1 AS rank FROM (
            SELECT name, max(score) AS best FROM scores
            WHERE mode = ? AND seed = ? AND name != ?
            GROUP BY name
            HAVING best > ?
          )`,
    args: [s.mode, s.seed, s.name, s.score],
  });
  return json({ ok: true, rank: Number(r.rows[0].rank) });
}
