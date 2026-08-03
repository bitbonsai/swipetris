import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { z } from "zod";
import { db, scores } from "./db";
import { desc, and, eq, sql } from "drizzle-orm";

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
  if (!plausible(s)) return c.json({ error: "score rejected" }, 422);
  await db.insert(scores).values({ ...s, createdAt: Date.now() });
  const [{ rank }] = await db
    .select({ rank: sql<number>`count(*) + 1` })
    .from(scores)
    .where(
      and(
        eq(scores.mode, s.mode),
        eq(scores.seed, s.seed),
        sql`${scores.score} > ${s.score}`,
      ),
    );
  return c.json({ ok: true, rank });
});

app.get("/api/leaderboard", async (c) => {
  const mode = c.req.query("mode") ?? "daily";
  const seed = Number(c.req.query("seed") ?? "0");
  const rows = await db
    .select()
    .from(scores)
    .where(and(eq(scores.mode, mode), eq(scores.seed, seed)))
    .orderBy(desc(scores.score))
    .limit(20);
  return c.json({ leaderboard: rows });
});

// no-store on HTML so dev iterations never serve stale pages
app.use("*", async (c, next) => {
  await next();
  const ct = c.res.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    c.res.headers.set("Cache-Control", "no-store");
  }
});

app.use("/*", serveStatic({ root: "./public" }));
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/play", serveStatic({ path: "./public/play.html" }));

const port = Number(process.env.PORT ?? 3000);
console.log(`swipetris on http://localhost:${port}`);
export default { port, fetch: app.fetch };
