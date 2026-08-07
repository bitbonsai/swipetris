# swipetris

Daily-challenge falling-blocks PWA. three.js game (`public/app.js`), Alpine UI (`public/play.html`), landing/about pages, Bun/Hono dev server (`src/`), prod on Cloudflare Pages + Pages Functions (`functions/api/`) + Turso. Live at swipetris.com.

## Commands

- `bun run dev`: local server (game + API) on :3000. Needs `.env` with `TURSO_URL`/`TURSO_TOKEN` at repo root.
- `bunx wrangler pages dev public`: test Pages Functions locally (reads `.env` too).
- Deploy = push to main (Pages git integration). Env vars set in Pages dashboard; changes apply only to NEW deployments.

## Gotchas

- Overlays (menu, game-over, `#sheet`) live INSIDE `#game-wrap`. Game input must skip `setPointerCapture` when `!running`, paused, or target is the sheet, or overlay buttons are dead. Test with real pointer events: `el.click()` bypasses the pointer pipeline and hides this bug.
- Pages Functions: repo has no build step → npm imports in `functions/` fail the bundle silently, deploy serves static-only. Keep `functions/` dependency-free (Turso via raw HTTP pipeline API in `functions/api/_shared.js`).
- Pages serves clean URLs natively. A `_redirects` rewrite like `/play /play.html 200` fights that normalization → 308 redirect loop. Never re-add.
- Bun auto-loads `.env` only from cwd. Missing vars → `src/db.ts` silently falls back to local `swipetris.db` file. If `swipetris.db` exists, you are NOT on Turso.
- Local dev with `.env` writes to the REAL prod Turso DB. Test submits land on today's live board (age out at midnight).
- Asset changes: bump `?v=N` on css/js refs in index/play/about.html AND the `CACHE` const in `sw.js`.
- Press Start 2P: uppercase only (lowercase glyphs unusable); needs `line-height: 1.7` when wrapping; letter-spacing leaves a trailing gap, so compensate with `text-indent` for optically centered text. Sentence-case UI text uses JetBrains Mono instead.
- Multi-row line clear: `splice`+`unshift` must iterate rows ASCENDING; descending removes the wrong rows.
- Daily piece sequence is seeded by local date on purpose (same board worldwide, fair leaderboard, Wordle-style). Not a bug.
- CPU leaderboard benchmarks are lazily reconciled on API reads after noon Europe/Amsterdam (not cron-driven): `synthetic=1`, three total places max, and CPU rows disappear as real players submit. Keep `functions/api/_seed.js` and `src/seed-bots.ts` behavior in sync.
