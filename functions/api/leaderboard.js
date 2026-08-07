import { exec, json } from "./_shared.js";
import { reconcileDailyBots } from "./_seed.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const mode = u.searchParams.get("mode") ?? "daily";
  const seed = Number(u.searchParams.get("seed") ?? "0");
  if (mode === "daily") await reconcileDailyBots(env, seed);
  const rows = await exec(
    env,
    `SELECT id, name, mode, seed, score, lines, level, pieces, synthetic
     FROM scores s
     WHERE mode = ? AND seed = ?
       AND score = (SELECT max(score) FROM scores WHERE mode = s.mode AND seed = s.seed AND name = s.name)
     GROUP BY name
     ORDER BY score DESC
     LIMIT 20`,
    [mode, seed],
  );
  return json({ leaderboard: rows });
}
