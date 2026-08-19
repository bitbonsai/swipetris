# Why

People fill every gap in the day swiping feeds: waiting for a build, standing in a coffee line. That swiping happens anyway; it can land somewhere fun and free instead. Existing falling-block apps charge subscriptions to remove ads, sell coins, and track location. The game people actually want is one page, one thumb, zero strings.

This project is also a working testbed for AI coding models: plan with one, build with another, polish with a third, and ship something real to judge them by.

# What

Swipetris: a mobile-first falling-blocks PWA with Wordle rules. One seeded piece sequence per day, the same for everyone, unlimited retries, only the best run counts. Drag to move, tap to rotate, flick to drop. Daily arcade leaderboard by three-letter initials. Free, open source, no ads, no accounts, no tracking.

# Definition of done

- Playable one-thumb on a phone; sessions work in under a minute
- Same daily sequence worldwide, seeded by local date
- Leaderboard stores one best run per initials, with plausibility and rate checks on untrusted scores
- Installable PWA that works offline
- Live at swipetris.com, deployed by pushing to main
- No accounts, cookies, or analytics anywhere
