ALTER TABLE scores ADD COLUMN synthetic INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_synthetic_slot
  ON scores (mode, seed, name) WHERE synthetic = 1;
