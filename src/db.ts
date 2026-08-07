import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mode: text("mode").notNull(), // 'daily' | 'endless'
  seed: integer("seed").notNull(),
  score: integer("score").notNull(),
  lines: integer("lines").notNull(),
  level: integer("level").notNull(),
  pieces: integer("pieces").notNull(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: integer("created_at").notNull(),
  synthetic: integer("synthetic").notNull().default(0),
});

// Turso in production (TURSO_URL + TURSO_TOKEN), local file for dev
const client = createClient({
  url: process.env.TURSO_URL ?? "file:swipetris.db",
  authToken: process.env.TURSO_TOKEN,
});

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    seed INTEGER NOT NULL,
    score INTEGER NOT NULL,
    lines INTEGER NOT NULL,
    level INTEGER NOT NULL,
    pieces INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    synthetic INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_scores_mode_seed ON scores (mode, seed, score DESC);
`);

const columns = await client.execute("PRAGMA table_info(scores)");
if (!columns.rows.some((row) => row.name === "synthetic")) {
  await client.execute("ALTER TABLE scores ADD COLUMN synthetic INTEGER NOT NULL DEFAULT 0");
}
await client.execute(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_synthetic_slot
  ON scores (mode, seed, name) WHERE synthetic = 1
`);

export const db = drizzle(client);
