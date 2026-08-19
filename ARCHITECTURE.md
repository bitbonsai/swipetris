# Tech stack

Philosophy follows the [Shibumi Stack](https://shibumistack.dev): small, readable pieces you can understand and keep, with Bun, Hono, SQLite, and Alpine at the core and no hidden build machinery.

- Game: three.js, all logic in `public/app.js`
- Play UI: Alpine.js in `public/play.html`; landing/about are static HTML + CSS
- Local dev: Bun + Hono server (`src/`), SQLite fallback when Turso env vars are absent
- Production: Cloudflare Pages (static `public/`, no build step) + dependency-free Pages Functions (`functions/api/`)
- Data: Turso (libSQL) via raw HTTP pipeline API; schema in `schema.sql`, additive `migrations/`
- Tests: `bun test`, covering seeding rules and CPU benchmark generation

# Infra and security

- Deploy = push to main; Pages git integration, env vars in the Pages dashboard (apply to new deployments only)
- Scores are untrusted client input: payload shape, daily seed, plausibility, timing, and submission rate validated before writes (`functions/api/_shared.js`)
- Synthetic CPU rows (`synthetic = 1`) fill boards with fewer than three players after noon Europe/Amsterdam, and yield to real players
- No secrets in the repo; `.env` local only, Turso token scoped to the one database
- No PII: three-character initials are the only user-supplied identity

# Unknowns

- Landscape layout (manifest is portrait-locked; browser-tab landscape looks cramped)
- Whether players want an endless/random mode alongside the daily board
- How far validation-based anti-cheat holds up if the leaderboard attracts real abuse
- Turso read volume if traffic spikes (leaderboard reads are per-page-load)
