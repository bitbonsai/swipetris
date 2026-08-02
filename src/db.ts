import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
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
});

const sqlite = new Database("swipetris.db");
sqlite.run(`
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
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_mode_seed ON scores (mode, seed, score DESC);
`);

export const db = drizzle(sqlite);
