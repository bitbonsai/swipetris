# Swipetris marketing strategy

## The objective

Launch Swipetris as the daily falling-block game people recommend when someone asks, “Is there a good version for my phone without ads?”

The first campaign should optimize for three things, in this order:

1. **Retention:** do people come back for tomorrow’s board?
2. **Sharing:** do players challenge somebody else after a good run?
3. **Reach:** can the story earn attention on Reddit, Hacker News, and LinkedIn?

Do not optimize for a one-day traffic spike before the first two are working.

## Positioning

### One-line pitch

> Wordle for falling blocks: everyone gets the same piece sequence each day, and only your best run counts.

### Founder story

> I grew up in the arcades of the 1980s. I wanted a good falling-block game for my phone, but every option seemed to come with ads, subscriptions, coins, tracking, or app-store baggage. So I made the version I wanted: one web page, designed for your thumb, with a fair daily challenge.

### Product promise

- Free, as a game like this should be
- No ads or subscriptions
- No account
- No cookies or product analytics
- Works offline as an installable PWA
- One shared daily piece sequence
- One leaderboard place per set of initials; only that player’s best daily run counts
- Open source under MIT

### Language to use

- “Wordle for falling blocks”
- “Same board. Best thumb wins.”
- “Built for one thumb”
- “A daily arcade challenge that lives on your phone”
- “Free. No ads. No account. No tracking.”

### Language to avoid

- Do not present it as an official Tetris product or use “Tetris” as the generic name of the game.
- Prefer “falling-block game,” “arcade classic,” or “inspired by the game I grew up with.”
- Do not call the leaderboard cheat-proof. The server rejects implausible submissions, but browser games cannot cryptographically prove a run.
- Say “only your best run counts,” not “only the best score gets stored.” Multiple runs are stored; the leaderboard displays each name’s best.
- Avoid “nothing ever leaves your phone.” Leaderboard requests and score submissions send game data to the server; all fonts and gameplay assets are self-hosted.

## Fix before broad promotion

The privacy claim is central, so it needs to be airtight.

- [x] Self-host Press Start 2P and JetBrains Mono instead of loading them from Google Fonts.
- [x] Verify the site sets no cookies in a clean browser session.
- [x] Verify there is no Cloudflare Web Analytics beacon or third-party tracking request, and consistently say “no product analytics.”
- [x] Test the full first-run flow on a real iPhone and Android phone using pointer events.
- [x] Make failed score submissions understandable instead of silently doing nothing.
- [x] Confirm the daily board, rollover, offline launch, replay, and score sharing all work.
- [x] Prepare a 10-15 second vertical gameplay clip, the animated gesture demo, two mobile screenshots, and the logo.
- [x] Make sure the creator story and source link are easy to find from the landing page.

## Launch order

Do not paste the same promotion into seven communities on the same day. It looks like spam, gives no time to fix problems, and splits attention when replies matter most.

All times below target both Europe and the US. `15:00 CEST` is approximately `09:00 ET`; adjust for daylight-saving changes.

| Order | Channel | Recommended time | Purpose |
|---|---|---|---|
| 0 | 5-10 direct testers | 2-3 days before launch | Find broken controls and confusing copy |
| 1 | r/playmygame ✅ | Wednesday, 15:00 CEST / 09:00 ET | Ask for honest control and game-feel feedback |
| 2 | r/WebGames ✅ | Wednesday, 15:00 CEST / 09:00 ET | Reach people already willing to play browser games |
| 3 | LinkedIn | Thursday, 08:30-10:00 in the poster’s local time | Tell the personal founder story to the warm network |
| 4 | r/SideProject | Thursday, 15:00 CEST / 09:00 ET | Tell the product and build story |
| 5 | Show HN | Following Tuesday through Thursday, 14:00-16:00 CEST / 08:00-10:00 ET | Technical launch after early feedback is fixed |
| 6 | r/InternetIsBeautiful | 2-4 days after HN | Broadest Reddit attempt once the experience is proven stable |
| 7 | r/opensource or a PWA community | Week 2 | Open-source and architecture angle |
| 8 | r/IndieGaming | Week 2, preferably with native video | Visual game-development angle |
| 9 | r/tetris | Only after moderator approval | Feedback from expert players, not a promotional blast |

Timing helps, but the bigger advantage is being available. Reserve at least two hours immediately after each post and check back throughout the day. A thoughtful reply can revive a thread; a silent creator kills one.

## Reddit strategy

### General rules

Subreddit rules change. Read each community’s current sidebar, pinned threads, title requirements, and self-promotion policy on the day of posting.

- Use an established personal account, not a new brand account.
- Disclose “I made this” immediately.
- Tailor every title and body to the community.
- Participate in other threads before and after posting.
- Never ask friends to mass-upvote or manufacture comments.
- Do not cross-post the identical link and copy across several subreddits in one day.
- If a subreddit limits self-promotion or requires a weekly showcase thread, use that thread.
- Link to `https://swipetris.com` for story-oriented communities and directly to `https://swipetris.com/play` only in communities that expect instant gameplay.

### Recommended communities

| Community | Fit | Angle | Caution |
|---|---:|---|---|
| r/playmygame | Excellent | Specific request for feedback on one-thumb controls | Be ready to give feedback to other developers too |
| r/WebGames | Excellent | Free browser game with no signup | Check title/link-post format before submitting |
| r/SideProject | Excellent | “I could not find the product I wanted, so I built it” | Discuss decisions and lessons, not just features |
| r/InternetIsBeautiful | High upside | Elegant, useful web experience with no install wall | Rules are strict; disclose affiliation and avoid marketing language |
| r/IndieGaming | Good | Native gameplay clip and retro-arcade story | Use the designated self-promo/showcase format if required |
| r/opensource | Good | MIT source, tiny PWA, dependency-free Pages Functions | Lead with architecture and contribution value |
| PWA-focused communities | Small but relevant | Installable/offline web app case study | Expect technical questions rather than player volume |
| r/tetris | Valuable but sensitive | Ask experienced players for control and game-feel feedback | Ask moderators first; do not imply affiliation or lead with promotion |

Avoid r/gamedev as a launch link unless its current rules explicitly provide a showcase or feedback thread. Broad nostalgia, 1980s, and Gen X communities are tempting but usually dislike drive-by self-promotion; earn moderator approval first.

## Reddit drafts

### r/playmygame

**Title**

> Swipetris: a free, ad-free daily falling-block game built for one thumb

**Body: required template**

> **Game Title:** Swipetris
>
> **Playable Link:** https://swipetris.com/play
>
> **Platform:** Web, a mobile-first PWA with desktop keyboard support. Add the **Web** flair after posting.
>
> **Description:** Swipetris is a gesture-first falling-block game designed for your phone. Drag to move, tap to rotate, and flick down to drop. Think Wordle, but with blocks: every player gets the same seeded piece sequence each day, you can replay as much as you want, and only your best run counts on the daily arcade leaderboard. I grew up playing arcade games in the 1980s and wanted a clean version without ads, coins, subscriptions, accounts, or app-store friction, so I built the version I wanted to play. It installs to your home screen, works offline after the first visit, and has four visual themes. There are no cookies, tracking scripts, or product analytics. The only game data sent to the server is for leaderboard requests and score submissions. I would especially value feedback on whether the one-thumb controls feel discoverable and precise, whether any gestures fire accidentally, and whether the shared daily board gives you a reason to return tomorrow.
>
> **Free to Play Status:**
>
> - [x] Free to play
> - [ ] Demo/Key available
> - [ ] Paid
>
> **Involvement:** I designed and built the entire game: the three.js gameplay and rendering, touch and keyboard controls, daily seeded challenge, score validation and leaderboard, PWA/offline behavior, landing pages, and backend. I am also the project maintainer. The source is available under the MIT License at https://github.com/bitbonsai/swipetris.

### r/WebGames

**Title**

> [OC] Swipetris. a free, ad-free daily falling-block game built for one thumb

**Body**

> Think Wordle, but for falling blocks: the same piece sequence for everyone each day, unlimited retries, and only your best run on the board.
>
> I built it because I wanted a clean version for my phone without ads, accounts, subscriptions, or app-store friction. It installs as a PWA and works offline.
>
> Drag to move, tap to rotate, flick down to drop.
>
> https://swipetris.com
>
> Source: https://github.com/bitbonsai/swipetris
>
> I made it, and I would love to know whether the touch controls feel natural on your device.

### r/SideProject

**Title**

> I couldn’t find a good ad-free falling-block game for my phone, so I built one

**Body**

> I grew up in the 80s and still love the directness of arcade games: put in a coin, learn the controls, chase a score. No currencies, funnels, or retention popups.
>
> That was surprisingly hard to find on a phone, so I built Swipetris.
>
> The idea is “Wordle for falling blocks”: every player gets the same seeded piece sequence each day. Replay as much as you want; only your best daily run occupies a leaderboard slot.
>
> It is one installable web app, works offline, and has no ads, account, cookies, subscription, or product analytics. The frontend uses three.js and Alpine; production is Cloudflare Pages plus dependency-free Functions and Turso. It is now MIT licensed.
>
> Play: https://swipetris.com
>
> Source: https://github.com/bitbonsai/swipetris
>
> The hardest part was making drag, tap, and flick coexist without making overlay controls unclickable. I’m interested in both product and technical feedback.

### r/InternetIsBeautiful

This may need to be a link post with no body. Keep the title descriptive rather than autobiographical.

**Title**

> Swipetris: a free daily falling-block game for your phone with no ads or account

**Creator disclosure comment**

> I made this. I grew up with 80s arcade games and wanted a clean version for my phone. The Wordle-inspired part is that everyone gets the same piece sequence each day and only their best run counts. It is an installable PWA, works offline, and has no cookies or product analytics. The source is public at https://github.com/bitbonsai/swipetris. Feedback is welcome.

### r/IndieGaming

Attach a native 10-15 second gameplay video rather than relying on a link preview.

**Title**

> I turned the falling-block game I grew up with into a one-thumb daily challenge

**Body**

> Drag to move. Tap to rotate. Flick to drop.
>
> Everyone gets the same piece sequence each day, so the leaderboard is a fair fight. It is free, browser-based, installable, works offline, and has no ads or account.
>
> I’m looking for feedback on game feel, especially lock delay, flick sensitivity, and whether the 3D board helps or distracts.
>
> https://swipetris.com
>
> Source: https://github.com/bitbonsai/swipetris

### r/opensource

**Title**

> Swipetris: an MIT-licensed, offline-first daily falling-block PWA

**Body**

> I open-sourced Swipetris, a one-thumb falling-block game with a Wordle-style shared daily sequence.
>
> The game is three.js with an Alpine UI. Local development runs on Bun/Hono; production is static Cloudflare Pages with dependency-free Pages Functions talking to Turso over the raw libSQL HTTP API. There is no frontend build step, account system, advertising, or product analytics.
>
> Live: https://swipetris.com
>
> Source: https://github.com/bitbonsai/swipetris
>
> Contributions and critiques are welcome, particularly around touch accessibility, offline behavior, and lightweight leaderboard abuse prevention.

### r/tetris: only with moderator approval

**Title**

> I made a gesture-first daily falling-block web game. Could experienced players critique the controls?

**Body**

> I grew up with arcade falling-block games and built a free mobile-first interpretation: drag to move, tap to rotate, and flick down to drop. The daily mode gives everyone the same sequence, Wordle-style.
>
> This is an independent project and not affiliated with the official game. I’m not here to claim it replaces competitive clients; I would genuinely value expert feedback on rotation, lock delay, scoring, and whether touch controls can feel precise enough.
>
> https://swipetris.com

## Hacker News

### Recommendation

Swipetris is a legitimate Show HN: it is something people can immediately use, it is personal, non-trivial, and has no signup barrier. The official Show HN guidance favors exactly that. Do not submit a launch essay instead of the playable URL.

There is no guaranteed “best time.” A practical window is Tuesday through Thursday, `08:00-10:00 ET` (`14:00-16:00 CEST`). Submit only when you can stay in the thread for the next four hours.

Do not ask anybody to upvote or comment. HN explicitly prohibits that.

### Submission

**Title**

> Show HN: Swipetris, a daily falling-block game for phones

**URL**

> https://swipetris.com

**Text field**

> Leave this blank. This is a URL submission, so put the context in the first comment immediately after submitting.

### First comment

> Hi HN, I made this after trying to find a straightforward falling-block game for my phone. I tried a few, got annoyed by the ads and virtual currencies, and decided to build one as a web app instead. I grew up playing arcade games in the 80s, so this is very much the version I wanted for myself.
>
> The controls are drag to move, tap to rotate, and flick down to drop. Each date produces the same piece sequence for everyone. You can play as often as you like, but the leaderboard only shows the best run under each set of five initials.
>
> There is no signup, advertising, subscription, cookie, or product analytics. It works offline after the first load. The leaderboard is the only networked feature.
>
> The frontend is three.js with Alpine for the UI. Production is static Cloudflare Pages. I ended up calling Turso's raw HTTP API from Pages Functions because npm imports caused the no-build deployment to silently serve static files only. The source is here: https://github.com/bitbonsai/swipetris
>
> The part I am least sure about is the touch input. Tap, horizontal drag, and downward flick all share the same pointer surface. If you try it on a phone, I would like to hear where it misreads you.

### Questions to prepare for

- Why 3D rather than a flat canvas?
- How is the daily sequence seeded across time zones?
- What is cached for offline use?
- Why Alpine and three.js instead of a framework/canvas-only build?
- What leaderboard validation exists, and what can still be cheated?
- Why the name, and how is the project distinguished from the official trademarked game?
- How can the “no product analytics” claim coexist with Cloudflare’s standard infrastructure logs?

Answer directly, including imperfections. HN responds better to technical honesty than launch copy.

## LinkedIn

### Main launch post

Post Tuesday through Thursday at `08:30-10:00` in the time zone where most of the poster’s network lives. Use a native vertical gameplay clip or animated gesture demo so the post communicates before anybody clicks. Keep the link in the post; forcing readers to hunt through comments is not worth a speculative algorithm benefit.

**Draft**

> I grew up in the arcades of the 1980s.
>
> The games were direct: learn the controls, chase a score, try again.
>
> Recently I wanted that same falling-block experience on my phone. What I found was mostly ads, subscriptions, coins, accounts, and tracking.
>
> So I made the version I wanted.
>
> **Swipetris is Wordle for falling blocks:**
>
> → the same piece sequence for everyone each day<br>
> → drag to move, tap to rotate, flick to drop<br>
> → replay as much as you want; only your best run counts<br>
> → installs on your home screen and works offline<br>
> → no ads, cookies, account, subscription, or product analytics
>
> It is free, as a game like this should be, and now open source under MIT.
>
> Play: https://swipetris.com<br>
> Source: https://github.com/bitbonsai/swipetris
>
> I’d love to know: do the gestures feel natural on your phone, and can you beat today’s board?
>
> #indiedev #PWA #opensource

### Follow-up post, 5-7 days later

Do not repost the launch pitch. Share a real lesson, a surprising comment, or a small result.

**Draft**

> One week after launching Swipetris, the most useful feedback wasn’t about graphics. It was about the half-second where a player decides whether a swipe means “move” or “drop.”
>
> Building a one-thumb arcade game made me appreciate how much invisible design lives inside a simple control.
>
> I’ve since [insert a specific change made from player feedback]. The daily board is still the same for everyone, and the game is still free, ad-free, account-free, and open source.
>
> Try today’s board: https://swipetris.com

Use actual observations and numbers only. Do not manufacture “hundreds of players” language from page views or impressions.

## How to create virality

Wordle did not spread merely because it was daily. It created a compact, recognizable, spoiler-free object people wanted to share. Swipetris needs its own version of that loop.

### Priority 0: a better result share

The current text share is useful but not distinctive enough. Generate a recognizable result card and plain-text equivalent after every run:

```text
SWIPETRIS · 2026-08-05
12,840 pts · 18 lines · #4
SAME BOARD. BEST THUMB WINS.
https://swipetris.com
```

Add a small pattern of colored blocks or a consistent score card so screenshots become recognizable in a feed. Do not reveal the piece sequence.

Trigger the share invitation most strongly for:

- A new personal best
- Entering the top 20
- Cracking the top 5
- Beating the current day best

The CTA should be **“Challenge a friend”**, not merely “Share.”

### Priority 1: “Beat my score” links

Create links such as:

```text
https://swipetris.com/play?beat=12840&by=MWOLF
```

The recipient should see “Beat MWOLF: 12,840” before starting, then play the exact same daily sequence. The score in the URL is motivational, not trusted server data. This creates a direct person-to-person loop without accounts or tracking.

### Priority 1: local streaks

Store streaks only in `localStorage`:

- Days played
- Consecutive daily boards
- Daily personal bests
- Top-5 finishes

Let players share “7-day streak” cards. Do not punish missed days with guilt copy or notifications.

### Priority 2: make the leaderboard social

- Give a top-5 finish a strong arcade “name entry” moment.
- Generate a daily winners card that can be posted from the official account.
- Let players tap a leaderboard row to create a “Can you beat this?” challenge.
- Clarify that initials are not authenticated identities; avoid treating them as accounts.

### Priority 2: turn installs into retention

After a player completes a second session, not immediately on first load, show the simple iPhone/Android home-screen instructions. The pitch is “tomorrow’s board is one tap away,” not “install our app.”

### Priority 3: recurring content

- Post a weekly “best thumbs” top-five card.
- Share a short build note when player feedback changes the controls.
- Publish a technical article about a dependency-free Cloudflare Pages/Turso leaderboard.
- Occasionally ship a visual theme tied to arcade history, without changing the fair daily rules.
- Invite small retro-gaming creators and PWA developers to challenge their audiences with a named target score.

### Outreach beyond the three launch channels

After the core launch:

- Send personal, non-templated notes to 10-15 small retro-arcade, web-game, and mobile-game creators.
- Pitch newsletters covering tiny web games, personal software, PWAs, and humane technology.
- Publish a short dev.to or personal blog post about making a no-build, offline-first game.
- Consider Product Hunt only after the result-sharing loop is stronger; it is a launch event, not a retention strategy.
- List the game on appropriate web-game/PWA directories, but avoid portals that inject advertising or wrap the game.

## Measuring without product analytics

The privacy promise is more valuable than precise attribution. Do not add invasive analytics just to produce a launch chart.

Cloudflare Pages/zone traffic metrics are acceptable as a rough infrastructure-level view of requests and estimated visitors because they require no application beacon, cookies, or new identifier. Do not enable Cloudflare Web Analytics/RUM. Treat edge metrics as reach, not “people who played”: bots, cached assets, and repeat visits make that claim unreliable. For engagement, prefer aggregate counts from the existing leaderboard data rather than collecting a new play event.

Use aggregate signals already available or public:

- Number of distinct initials submitting per daily seed, with the caveat that initials are not unique people
- Number of submitted runs per day
- Approximate next-day return rate for recurring initials
- Number of top-5 and top-20 entries
- GitHub stars, forks, issues, and contributors
- Reddit votes, comments, and qualitative feedback
- HN points and, more importantly, substantive comments
- LinkedIn reach and comments from the platform’s own post insights
- Direct messages saying somebody challenged a friend

Keep a manual launch log:

| Date/time | Channel | Post URL | Hook used | Public response | Product feedback | Change made |
|---|---|---|---|---|---|---|
| | | | | | | |

Do not use UTM parameters if the public promise is “no tracking.” Ask “what made you try it?” in conversation instead of silently tracking every person.

## What success looks like

The first two weeks are successful if:

- Players voluntarily share scores or challenge friends
- Some initials return for multiple daily boards
- Touch-control feedback becomes specific rather than “I don’t understand it”
- At least one community discusses the daily/fairness idea, not merely the visuals
- The launch produces a short list of product changes supported by repeated feedback

A front page, thousands of impressions, or a viral LinkedIn post is useful only if tomorrow’s board still has returning players.

## Launch-day checklist

- [ ] Read the target community’s rules again
- [ ] Test production on iPhone and Android
- [ ] Confirm score submission and leaderboard load
- [ ] Confirm the share result is correct for today’s seed
- [x] Prepare one native video/GIF and one still image
- [ ] Post from the creator’s personal identity and disclose authorship
- [ ] Stay available for at least two hours
- [ ] Reply to every good-faith question
- [ ] Record feedback in the launch log
- [ ] Fix critical issues before moving to the next channel
- [ ] Never ask for coordinated upvotes
