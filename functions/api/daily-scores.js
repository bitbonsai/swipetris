import { exec, json } from "./_shared.js";

export async function onRequestGet({ env }) {
  // Each player gets one place per day; keep the archive compact at 90 boards.
  const rows = await exec(
    env,
    `WITH player_bests AS (
       SELECT seed, name, max(score) AS score
       FROM scores
       WHERE mode = 'daily'
       GROUP BY seed, name
     ), recent_days AS (
       SELECT seed FROM player_bests GROUP BY seed ORDER BY seed DESC LIMIT 90
     ), ranked AS (
       SELECT seed, name, score,
         row_number() OVER (PARTITION BY seed ORDER BY score DESC, name ASC) AS rank
       FROM player_bests
     )
     SELECT seed, name, score
     FROM ranked
     WHERE rank <= 5 AND seed IN (SELECT seed FROM recent_days)
     ORDER BY seed DESC, rank ASC`,
  );
  const days = new Map();
  for (const row of rows) {
    const day = days.get(row.seed) ?? { seed: row.seed, leaderboard: [] };
    day.leaderboard.push({ name: row.name, score: row.score });
    days.set(row.seed, day);
  }
  return json({ dailyScores: [...days.values()] });
}
