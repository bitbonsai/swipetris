import { describe, expect, test } from "bun:test";
import { botTarget, dailyBotRows, shouldSeedDailyBots } from "../functions/api/_seed.js";

describe("daily CPU scores", () => {
  test("start at noon in the configured time zone", () => {
    expect(shouldSeedDailyBots(20260807, new Date("2026-08-07T09:59:59Z"), "Europe/Amsterdam")).toBe(false);
    expect(shouldSeedDailyBots(20260807, new Date("2026-08-07T10:00:00Z"), "Europe/Amsterdam")).toBe(true);
    expect(shouldSeedDailyBots(20260806, new Date("2026-08-07T10:00:00Z"), "Europe/Amsterdam")).toBe(false);
  });

  test("fills only the empty places on a three-player board", () => {
    expect([0, 1, 2, 3, 4].map(botTarget)).toEqual([3, 2, 1, 0, 0]);
  });

  test("generates deterministic, plausible benchmark rows", () => {
    const rows = dailyBotRows(20260807, 123);
    expect(rows).toEqual(dailyBotRows(20260807, 123));
    expect(rows.map((row) => row.name)).toEqual(["BYTE", "DROP", "GHOST"]);

    for (const row of rows) {
      expect(row.score).toBeGreaterThanOrEqual(5_000);
      expect(row.score).toBeLessThanOrEqual(45_000);
      expect(row.synthetic).toBe(1);
      expect(row.level).toBe(Math.floor(row.lines / 10) + 1);
      expect(row.lines * 10).toBeLessThanOrEqual(row.pieces * 4);
      expect(row.score).toBeLessThanOrEqual(row.lines * 200 * row.level + row.pieces * 44);
      expect(row.durationMs).toBeGreaterThanOrEqual(row.pieces * 50);
    }
  });
});
