import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { z } from "zod";
import { db, scores } from "./db";
import { desc, and, eq, sql } from "drizzle-orm";

const app = new Hono();

const scoreSchema = z.object({
  name: z.string().trim().min(1).max(12),
  mode: z.enum(["daily", "endless"]),
  seed: z.number().int().min(0),
  score: z.number().int().min(0).max(9_999_999),
  lines: z.number().int().min(0).max(9_999),
  level: z.number().int().min(1).max(99),
  pieces: z.number().int().min(1).max(99_999),
  durationMs: z.number().int().min(0).max(86_400_000),
});

app.post("/api/score", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid score payload" }, 400);
  }
  const s = parsed.data;
  db.insert(scores)
    .values({ ...s, createdAt: Date.now() })
    .run();
  const [{ rank }] = db
    .select({ rank: sql<number>`count(*) + 1` })
    .from(scores)
    .where(
      and(
        eq(scores.mode, s.mode),
        eq(scores.seed, s.seed),
        sql`${scores.score} > ${s.score}`,
      ),
    )
    .all();
  return c.json({ ok: true, rank });
});

app.get("/api/leaderboard", (c) => {
  const mode = c.req.query("mode") ?? "daily";
  const seed = Number(c.req.query("seed") ?? "0");
  const rows = db
    .select()
    .from(scores)
    .where(and(eq(scores.mode, mode), eq(scores.seed, seed)))
    .orderBy(desc(scores.score))
    .limit(20)
    .all();
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

const port = Number(process.env.PORT ?? 3000);
console.log(`swipetris on http://localhost:${port}`);
export default { port, fetch: app.fetch };
