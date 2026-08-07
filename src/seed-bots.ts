import { sql } from "drizzle-orm";
import { db } from "./db";

export const CPU_NAMES = ["BYTE", "DROP", "GHOST"] as const;
const DEFAULT_TIME_ZONE = "Europe/Amsterdam";

function localParts(now: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour", number>;
}

export function currentDailySeed(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const { year, month, day } = localParts(now, timeZone);
  return year * 10000 + month * 100 + day;
}

export function shouldSeedDailyBots(seed: number, now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = localParts(now, timeZone);
  return seed === parts.year * 10000 + parts.month * 100 + parts.day && parts.hour >= 12;
}

function randomFor(seed: number) {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function dailyBotRows(seed: number, createdAt: number) {
  const random = randomFor(seed);
  const generated = CPU_NAMES.map(() => 5_000 + Math.floor(Math.pow(random(), 1.7) * 40_001));
  generated.sort((a, b) => a - b);

  return generated.map((score, index) => {
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

export async function reconcileDailyBots(seed: number, now = new Date()) {
  if (!shouldSeedDailyBots(seed, now, process.env.BOT_TIME_ZONE ?? DEFAULT_TIME_ZONE)) return;

  const [{ count }] = await db.all<{ count: number }>(sql`
    SELECT count(DISTINCT name) AS count
    FROM scores
    WHERE mode = 'daily' AND seed = ${seed} AND synthetic = 0
  `);
  const target = Math.max(0, 3 - Number(count));

  for (let index = target; index < CPU_NAMES.length; index++) {
    await db.run(sql`
      DELETE FROM scores
      WHERE mode = 'daily' AND seed = ${seed} AND synthetic = 1 AND name = ${CPU_NAMES[index]}
    `);
  }

  for (const row of dailyBotRows(seed, now.getTime()).slice(0, target)) {
    await db.run(sql`
      INSERT OR IGNORE INTO scores
        (name, mode, seed, score, lines, level, pieces, duration_ms, created_at, synthetic)
      SELECT ${row.name}, ${row.mode}, ${row.seed}, ${row.score}, ${row.lines}, ${row.level},
        ${row.pieces}, ${row.durationMs}, ${row.createdAt}, ${row.synthetic}
      WHERE NOT EXISTS (
        SELECT 1 FROM scores
        WHERE mode = ${row.mode} AND seed = ${row.seed} AND name = ${row.name} AND synthetic = 1
      )
    `);
  }
}
