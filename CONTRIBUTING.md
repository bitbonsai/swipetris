# Contributing

Thanks for helping improve Swipetris.

## Before opening a pull request

1. Open an issue first for large features or changes to game rules.
2. Keep changes focused and avoid adding a frontend build step without discussion.
3. Preserve touch and pointer behavior on real devices; synthetic `click()` tests do not exercise the full pointer pipeline.
4. Respect `prefers-reduced-motion` for new animation.
5. Never commit `.env`, database files, credentials, or Wrangler state.

## Development

```sh
bun install
bun run dev
```

The default local database is `swipetris.db`. To exercise Cloudflare Pages Functions, set development Turso credentials in `.env` and run:

```sh
bunx wrangler pages dev public
```

## Testing

Run the automated test suite before submitting a PR:

```sh
bun test
```

Current automated coverage focuses on deterministic daily CPU benchmark generation and seeding rules. Also complete the relevant manual checks:

- Start a game and verify drag, tap, flick, pause, game over, and replay using real pointer input.
- Check the landing, play, about, and scores pages at mobile and desktop widths.
- Verify offline/PWA changes with a production-style service worker context.
- If assets changed, update cache-busting versions in the HTML and the cache name in `public/sw.js`.
- If API code changed, test both `src/` and the matching handler in `functions/api/`.

Include the devices/browsers and commands you tested in the pull request.
