import { exec } from "./_shared.js";

export const CPU_NAMES = ["BYTE", "DROP", "GHOST"];
const DEFAULT_TIME_ZONE = "Europe/Amsterdam";

function localParts(now, timeZone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );
}

export function currentDailySeed(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const { year, month, day } = localParts(now, timeZone);
  return year * 10000 + month * 100 + day;
}

export function shouldSeedDailyBots(seed, now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = localParts(now, timeZone);
  return seed === parts.year * 10000 + parts.month * 100 + parts.day && parts.hour >= 12;
}

export function botTarget(realPlayers) {
  return Math.max(0, 3 - realPlayers);
}

function randomFor(seed) {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export function dailyBotRows(seed, createdAt = Date.now()) {
  const random = randomFor(seed);
  const scores = CPU_NAMES.map(() => 5_000 + Math.floor(Math.pow(random(), 1.7) * 40_001));
  scores.sort((a, b) => a - b);

  return scores.map((score, index) => {
    const lines = 18 + Math.floor(score / 900);
    const pieces = Math.ceil(lines * 2.5) + 20 + Math.floor(random() * 20);
    return {
      name: CPU_NAMES[index],
      mode: "daily",
      seed,
      score,
      lines,
      level: Math.floor(lines / 10) + 1,
      pieces,
      durationMs: pieces * (2_500 + Math.floor(random() * 2_500)),
      createdAt,
      synthetic: 1,
    };
  });
}

export async function reconcileDailyBots(env, seed, now = new Date()) {
  const timeZone = env.BOT_TIME_ZONE || DEFAULT_TIME_ZONE;
  if (!shouldSeedDailyBots(seed, now, timeZone)) return;

  const [{ count }] = await exec(
    env,
    "SELECT count(DISTINCT name) AS count FROM scores WHERE mode = 'daily' AND seed = ? AND synthetic = 0",
    [seed],
  );
  const target = botTarget(Number(count));
  const wanted = dailyBotRows(seed, now.getTime()).slice(0, target);

  if (wanted.length === 0) {
    await exec(env, "DELETE FROM scores WHERE mode = 'daily' AND seed = ? AND synthetic = 1", [seed]);
  } else {
    const placeholders = wanted.map(() => "?").join(", ");
    await exec(
      env,
      `DELETE FROM scores WHERE mode = 'daily' AND seed = ? AND synthetic = 1 AND name NOT IN (${placeholders})`,
      [seed, ...wanted.map((row) => row.name)],
    );
  }

  for (const row of wanted) {
    await exec(
      env,
      `INSERT OR IGNORE INTO scores
       (name, mode, seed, score, lines, level, pieces, duration_ms, created_at, synthetic)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM scores WHERE mode = ? AND seed = ? AND name = ? AND synthetic = 1
       )`,
      [
        row.name, row.mode, row.seed, row.score, row.lines, row.level, row.pieces, row.durationMs, row.createdAt, row.synthetic,
        row.mode, row.seed, row.name,
      ],
    );
  }
}
