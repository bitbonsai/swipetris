import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { z } from "zod";
import { db, scores } from "./db";
import { sql } from "drizzle-orm";
import { CPU_NAMES, currentDailySeed, reconcileDailyBots } from "./seed-bots";

const app = new Hono();

const scoreSchema = z.object({
  name: z.string().trim().min(1).max(5),
  mode: z.literal("daily"),
  seed: z.number().int().min(0),
  score: z.number().int().min(0).max(9_999_999),
  lines: z.number().int().min(0).max(9_999),
  level: z.number().int().min(1).max(99),
  pieces: z.number().int().min(1).max(99_999),
  durationMs: z.number().int().min(0).max(86_400_000),
});

// a submitted score must at least be self-consistent with the game's rules
function plausible(s: z.infer<typeof scoreSchema>): boolean {
  // level is derived deterministically from lines
  if (s.level !== Math.floor(s.lines / 10) + 1) return false;
  // each cleared line needs 10 cells; pieces provide 4 each
  if (s.lines * 10 > s.pieces * 4) return false;
  // best case per line is a tetris (200*level per line) + max drop bonus per piece
  if (s.score > s.lines * 200 * s.level + s.pieces * 44) return false;
  // nobody places a piece faster than ~50ms sustained
  if (s.durationMs < s.pieces * 50) return false;
  // daily seed must be today-ish (players span UTC-12..+14)
  if (s.mode === "daily") {
    const days = [-1, 0, 1].map((off) => {
      const d = new Date(Date.now() + off * 86_400_000);
      return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    });
    if (!days.includes(s.seed)) return false;
  }
  return true;
}

// naive fixed-window rate limit per IP
const submits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const slot = submits.get(ip);
  if (!slot || now > slot.resetAt) {
    submits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  slot.count++;
  if (submits.size > 10_000) submits.clear(); // memory backstop
  return slot.count > 10;
}

app.post("/api/score", async (c) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return c.json({ error: "slow down" }, 429);
  const body = await c.req.json().catch(() => null);
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid score payload" }, 400);
  }
  const s = parsed.data;
  if (CPU_NAMES.includes(s.name.toUpperCase() as typeof CPU_NAMES[number])) {
    return c.json({ error: "reserved CPU name" }, 400);
  }
  if (!plausible(s)) return c.json({ error: "score rejected" }, 422);
  await db.insert(scores).values({ ...s, createdAt: Date.now(), synthetic: 0 });
  await reconcileDailyBots(s.seed);
  // rank against each other player's best run (one slot per name)
  const [{ rank }] = await db.all<{ rank: number }>(sql`
    SELECT count(*) + 1 AS rank FROM (
      SELECT name, max(score) AS best FROM scores
      WHERE mode = ${s.mode} AND seed = ${s.seed} AND name != ${s.name}
      GROUP BY name
      HAVING best > ${s.score}
    )
  `);
  return c.json({ ok: true, rank });
});

app.get("/api/leaderboard", async (c) => {
  const mode = c.req.query("mode") ?? "daily";
  const seed = Number(c.req.query("seed") ?? "0");
  if (mode === "daily") await reconcileDailyBots(seed);
  // best run per name: one leaderboard slot per player
  const rows = await db.all(sql`
    SELECT id, name, mode, seed, score, lines, level, pieces, synthetic
    FROM scores s
    WHERE mode = ${mode} AND seed = ${seed}
      AND score = (SELECT max(score) FROM scores WHERE mode = s.mode AND seed = s.seed AND name = s.name)
    GROUP BY name
    ORDER BY score DESC
    LIMIT 20
  `);
  return c.json({ leaderboard: rows });
});

app.get("/api/daily-scores", async (c) => {
  await reconcileDailyBots(currentDailySeed(new Date(), process.env.BOT_TIME_ZONE ?? "Europe/Amsterdam"));
  // Each player gets one place per day; keep the archive compact at 90 boards.
  const rows = await db.all<{ seed: number; name: string; score: number; synthetic: number }>(sql`
    WITH player_bests AS (
      SELECT seed, name, max(score) AS score, max(synthetic) AS synthetic
      FROM scores
      WHERE mode = 'daily'
      GROUP BY seed, name
    ), recent_days AS (
      SELECT seed FROM player_bests GROUP BY seed ORDER BY seed DESC LIMIT 90
    ), ranked AS (
      SELECT seed, name, score, synthetic,
        row_number() OVER (PARTITION BY seed ORDER BY score DESC, name ASC) AS rank
      FROM player_bests
    )
    SELECT seed, name, score, synthetic
    FROM ranked
    WHERE rank <= 5 AND seed IN (SELECT seed FROM recent_days)
    ORDER BY seed DESC, rank ASC
  `);
  const bySeed = new Map<number, { seed: number; leaderboard: { name: string; score: number; synthetic: number }[] }>();
  for (const row of rows) {
    const day = bySeed.get(row.seed) ?? { seed: row.seed, leaderboard: [] };
    day.leaderboard.push({ name: row.name, score: row.score, synthetic: row.synthetic });
    bySeed.set(row.seed, day);
  }
  return c.json({ dailyScores: [...bySeed.values()] });
});

// no-store on HTML, revalidate js/css; stale app.js against fresh HTML breaks module imports
app.use("*", async (c, next) => {
  await next();
  const ct = c.res.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    c.res.headers.set("Cache-Control", "no-store");
  } else if (ct.includes("javascript") || ct.includes("text/css")) {
    c.res.headers.set("Cache-Control", "no-cache");
  }
});

app.use("/*", serveStatic({ root: "./public" }));
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/play", serveStatic({ path: "./public/play.html" }));
app.get("/about", serveStatic({ path: "./public/about.html" }));
app.get("/scores", serveStatic({ path: "./public/scores.html" }));

const port = Number(process.env.PORT ?? 3000);
console.log(`swipetris on http://localhost:${port}`);
export default { port, fetch: app.fetch };
