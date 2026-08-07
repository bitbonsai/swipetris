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

CREATE INDEX IF NOT EXISTS idx_scores_mode_seed
  ON scores (mode, seed, score DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_synthetic_slot
  ON scores (mode, seed, name) WHERE synthetic = 1;
