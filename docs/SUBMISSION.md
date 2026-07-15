# RAMAGEDDON — Devpost Submission Kit

This document is the copy desk for the competition entry. Text marked
**ready to paste** assumes the corresponding feature is visible and functional
in the uploaded Reddit post. If a feature fails the claims gate below, fix the
build or remove that claim before submission.

## Competition links

| Devpost field                      | Value                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| App listing                        | `https://developers.reddit.com/apps/ramageddon-game`                                        |
| Demo subreddit                     | `https://www.reddit.com/r/ramageddon_game_dev`                                              |
| Running demo post                  | `https://www.reddit.com/r/ramageddon_game_dev/comments/1uws1an/ramageddon_daily_wreckpile/` |
| Public demo video                  | `[DEMO_VIDEO_URL]`                                                                          |
| Public source repository, optional | `https://github.com/BoneShaman/RAMAGEDDON`                                                  |
| Privacy policy                     | `https://github.com/BoneShaman/RAMAGEDDON/blob/main/docs/PRIVACY.md`                        |
| Terms                              | `https://github.com/BoneShaman/RAMAGEDDON/blob/main/docs/TERMS.md`                          |

Do not replace the running demo post with a standalone web-hosting link. Judges
need the game running as a Reddit Interactive Post.

## Current release evidence

- Devpost accepted the submission on July 15, 2026 at approximately 1:43pm AEST.
  The project page displays **Project submitted!** and **SUBMITTED TO**, remains
  editable until the deadline, and is publicly reachable without session
  cookies at `https://devpost.com/software/ramageddon`.
- Devvit 0.0.5 is uploaded, installed, and serving the existing demo post.
- Live desktop-browser validation loaded real daily/community state, entered the
  expanded game, and confirmed the final `0-0-5-webview` URL and signed Devvit
  token. The production run started with active audio and produced an x7 opening
  wreck cascade; the preceding 0.0.2 gameplay audit reached the first upgrade
  without a visible client error.
- Exact 613×512 feed and 333×515 expanded browser layouts pass without clipping
  or inline scrolling. Desktop keyboard and simulated touch
  steering/drift/pause/sound/card/replay paths pass the focused release suite.
- A prior natural 180-second local run defeated the Road King and remained
  playable at approximately 54 fps under 4× CPU throttling. In the final harder
  balance, an offense-prioritized active policy destroyed the Road King at
  175.03 seconds; a focused final QA branch confirms that destroying the boss
  now resolves victory immediately.
- Reddit approved the demo community as Public. A fresh Firefox Private Browsing
  session, visibly signed out, loaded the exact post and its embedded RAMAGEDDON
  feed card.
- A final live mobile-sized 0.0.5 run completed at 1,778 score, 12 wrecks, x7
  best combo, and 24 scrap; its result synced and rendered the Wreckpile and
  Blueprint Vote flow without a corresponding production error log entry.
- A complete ordinary-user run, native Reddit mobile, and two-account
  shared-state testing remain recommended evidence rather than submission
  blockers.

## Submission metadata

- **Project title:** RAMAGEDDON
- **Tagline:** The horde is the weapon. Wrecks become weapons.
- **Primary category:** Best App with a Hook
- **Also relevant:** Best Use of Phaser; Best Use of Retention Mechanics; Best
  Use of User Contributions
- **Built with:** Phaser 4, Devvit Web, TypeScript, Hono, Redis, Vite
- **Suggested thumbnail text:** `WRECKS BECOME WEAPONS`

## Short description — ready to paste

> RAMAGEDDON is a top-down destruction-derby survivor where a clean ram launches
> the destroyed car as a high-speed hot wreck that can smash through the rest of
> the horde. Fast three-minute runs feed a daily Wreckpile, crew competition,
> leaderboards, and a Blueprint Vote that changes tomorrow's starting upgrade.

## Full description — ready to paste

### Inspiration

> We love the rising pressure and buildcraft of arena-survivor games, but a
> defeated enemy is usually just subtraction. Destruction derbies have the
> opposite magic: one impact causes another, and a bad traffic jam can become a
> spectacular plan.
>
> RAMAGEDDON fuses those ideas around one rule: **the horde is the weapon.**

### What it does

> RAMAGEDDON is a compact top-down survival run inside a Reddit Interactive Post.
> The player drives through escalating waves of hostile vehicles while weapons
> fire automatically. A clean ram launches the defeated vehicle as a hot wreck
> along the impact line. If that wreck destroys another enemy, the new wreck
> carries the cascade forward. A verified playtest produced an x21 wreck
> combo/cascade with 18 hot wrecks active simultaneously.
>
> Scrap and XP produce quick upgrade choices that change handling, ramming,
> defense, orbiting saws, an automatic nailgun, burning drift trails, magnet
> reach, overdrive, and chain power. The first impact arrives in under five
> seconds and the first tested level-up arrived at 21.6 seconds; the run then
> escalates toward a Road King boss and overtime showdown.

### The Reddit-native hook

> A run is satisfying alone, but it does not end alone.
>
> - The **Daily Wreckpile** gives the community one server-seeded daily event.
>   Each player's best daily scrap grows the shared tier, while their best wreck
>   count raises the community total.
> - Three **Crews** turn personal best scores into an asynchronous team contest.
> - A fresh **daily leaderboard** gives every player another fair starting line.
> - The three-option **Blueprint Vote** determines the next day's community-wide
>   starting upgrade. Today's result creates tomorrow's anticipation.
>
> These mechanics work at any population size, create conversation without
> requiring synchronous multiplayer, and make the Reddit post more than a
> container for a solo game.

### How we built it

> Phaser 4 runs a responsive Canvas client in a Devvit Web expanded view.
> TypeScript drives a fixed-step simulation and shared client/server contracts.
> A Hono server validates authenticated `/api` requests, while Devvit Redis
> transactions persist daily scores, crew totals, Blueprint Votes, personal
> bests, streaks, and Wreckpile progress. Reddit provides identity and post
> context, so players do not need a second account or an off-platform profile.
>
> The visual identity is drawn procedurally with Phaser Graphics. Audio combines
> responsive WebAudio synthesis with original SFX generated locally using Stable
> Audio 3 and edited specifically for the game; exact prompts, seeds, processing,
> and rejected-clip policy are recorded in `docs/AUDIO_PROVENANCE.md`. Collision
> response, threat readability, spawn pressure, upgrade cadence, hit-stop, camera
> trauma, particles, audio, and score presentation are tuned as one impact
> system.

### Challenges

> The hardest design problem was making a wreck cascade feel authored by the
> player's line rather than random. Hot wrecks need enough inherited momentum to
> be exciting, enough lifetime to find the next victim, and enough damping to
> keep a dense swarm readable and performant. We tuned the player's silhouette,
> collision callouts, score cadence, and safe driving line to retain the visual
> hierarchy during a large cascade.
>
> The second challenge was making the community layer native to the run. We did
> not want a leaderboard bolted onto an unrelated game. The Wreckpile, crews,
> and vote are framed as the continuation of the same fantasy: a whole community
> building tomorrow's arena out of today's glorious mistakes.

### What we are proud of

> RAMAGEDDON's strongest moment is when a bad situation becomes a plan: the
> player lines up a front-corner ram and watches the pursuing swarm collapse into
> a chain reaction. That is not just spectacle. The launch direction, enemy
> density, upgrades, and timing all come from the player's driving.
>
> We are also proud that the game is designed for the feed: one obvious action,
> seconds to first movement, short runs, responsive presentation, and meaningful
> reasons to check the community result later.

### What's next

> After the hackathon we want to expand the blueprint pool, add more crew-season
> formats, deepen specialist enemy behavior, and let communities run their own
> themed rule sets while preserving the immediate pick-up-and-play core.

## Judging alignment

| Criterion         | What to show, not merely tell                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delightful UX     | Start from the Reddit post, reach movement in seconds, show a clear upgrade choice, legible HUD, strong impact feedback, and a one-action retry.                                                                                  |
| Polish            | Show the uploaded build on desktop and mobile, responsive layouts, no inline scroll, no starter assets, no clipping, no console errors, and graceful API failure states.                                                          |
| Reddit-y          | Show the Wreckpile, crews, daily/community totals, and Blueprint Vote changing shared state for the demo subreddit.                                                                                                               |
| Hook              | Show today's seed/goal, daily board reset language, persistent personal goals, Blueprint Vote confirmation/tomorrow consequence, and an explicit reason to return.                                                                |
| Phaser Innovation | Show ram-launched, momentum-carrying hot wrecks propagating through a large readable swarm, fixed-step simulation, procedural rendering, particles/hit-stop/camera/WebAudio response, responsive scaling, and stable performance. |

The first judging stage is pass/fail: the project must visibly fit the community
retention theme and meaningfully use Devvit. Do not make judges infer the social
loop from this document; put it in the first playable post and the video.

## Claims gate

Check each claim against the uploaded build before pasting the description:

- [x] Vehicles destroyed by a ram or an already-hot wreck become short-lived,
      momentum-carrying wreck projectiles that damage other enemies.
- [x] A player can deliberately aim the first impact through a packed pursuit
      line; controlled playtesting confirmed an x21 wreck combo/cascade with 18
      hot wrecks active simultaneously.
- [x] The run has escalating threats, damage, death, replay, XP, and meaningful
      upgrade choices.
- [x] The daily seed/event is UTC-date-keyed by the server rather than the client.
- [x] Authenticated completed-run submissions update the Daily Wreckpile using
      each player's best daily scrap/wreck contribution.
- [x] Crew selection and aggregate crew standings use Redis persistence.
- [x] Daily and personal bests use Redis leaderboards and strict server request
      schemas/numeric bounds.
- [x] Blueprint Vote choices persist, safely replace a player's earlier daily
      choice, and determine the next day's community upgrade.
- [x] Desktop and touch control paths, cards, pause, sound, fullscreen, and replay
      are implemented.
- [x] Type-check, lint, and production build pass.
- [ ] All shared systems work from at least two separate Reddit accounts.
- [ ] The final uploaded post is exercised on Reddit mobile and desktop.
- [ ] Every visual in the video is captured from the actual uploaded build.

If an unchecked item cannot be repaired before the deadline, remove the feature
from the ready-to-paste copy and refocus the entry on what the judges can prove.

## Media capture shot list

Capture clean images at native resolution with no developer overlays, account
notifications, private information, cursor clutter, or browser chrome unless
the Reddit-post context is intentionally being demonstrated.

1. **Hero / thumbnail:** player car breaking through a dense wreck cascade;
   title and “Wrecks become weapons” remain readable at small size.
2. **Reddit proof:** the demo post in-feed with a clear play call to action and
   original RAMAGEDDON branding.
3. **First five seconds:** readable HUD, immediate driving, enemy intent, and the
   first confirmed impact.
4. **The signature mechanic:** one hot wreck launched down a pursuit line,
   visibly causing the next wreck.
5. **Peak cascade:** the verified x21 wreck combo/cascade with 18 simultaneous
   hot wrecks, or another dense but readable moment with a clear player
   silhouette and score/combo callout.
6. **Buildcraft:** upgrade cards with short, specific descriptions and visible
   before/after impact.
7. **Daily Wreckpile:** shared total, current daily identity, and clear community
   progress.
8. **Crews and leaderboard:** personal result, crew contribution, and rankings
   in one coherent results flow.
9. **Blueprint Vote:** the three safe choices, selection confirmation, and clear
   “tomorrow” consequence.
10. **Mobile proof:** actual Reddit mobile-sized play with touch controls and no
    clipping or inline scrolling.

Recommended Devpost gallery order: hero, signature mechanic, Wreckpile/social
screen, upgrade/buildcraft, mobile proof.

## 60-second demonstration video

Target 56–58 seconds. Judges are not required to watch beyond one minute. Use
actual footage from the submitted Reddit post and show the pointer/touch input
sparingly so cause and effect remain obvious.

| Time      | Picture                                                           | Voice-over / on-screen copy                                                              |
| --------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0:00–0:04 | Live Reddit post, click **Play**, immediate RAMAGEDDON title      | “The horde is the weapon. Wrecks become weapons.”                                        |
| 0:04–0:11 | First movement, enemies converge, auto-weapon lands               | “RAMAGEDDON is a destruction-derby survivor built inside Reddit with Phaser and Devvit.” |
| 0:11–0:21 | Ram one car; its hot wreck launches through the pursuit line      | “Every clean ram carries its momentum forward as a hot wreck.”                           |
| 0:21–0:29 | Show the x21 wreck combo/cascade and simultaneous hot wrecks      | “Aim one impact well, and the entire swarm becomes ammunition.”                          |
| 0:29–0:36 | Pick one upgrade; show the changed behavior immediately           | “Fast upgrade choices reshape ramming, handling, defense, and weapons.”                  |
| 0:36–0:44 | Late-run escalation, Road King, then result transition            | “Survive the swarm, dethrone the Road King, and bank one glorious run.”                  |
| 0:44–0:51 | Best result submits to the board and raises crew/Wreckpile totals | “Your best result feeds today's Wreckpile, crew showdown, and leaderboard.”              |
| 0:51–0:56 | Blueprint Vote selection and tomorrow confirmation                | “Then the community votes on what comes next.”                                           |
| 0:56–0:59 | Hero end card and Reddit post URL/QR only if legible              | “RAMAGEDDON. Today's wrecks build tomorrow's mayhem.”                                    |

### Capture and edit rules

- Keep the final file under 60 seconds, including logos and end card.
- Show the game functioning on its intended desktop/mobile device.
- Use music, fonts, sound effects, and imagery only with documented rights.
- Mix voice clearly above effects; add accurate burned-in captions.
- Do not simulate community totals or label mock data as live.
- Upload publicly to YouTube, Vimeo, Facebook Video, or Youku.
- Watch the public link while signed out before adding it to Devpost.

## Suggested image captions

- **Wrecks become weapons:** One clean launch can turn an entire pursuit line
  into ammunition.
- **Verified mayhem:** First impact under five seconds. First upgrade at 21.6.
  Confirmed x21 wreck combo/cascade with 18 hot wrecks active simultaneously.
- **One daily pile, many glorious mistakes:** Short runs build a shared community
  event.
- **Choose tomorrow's trouble:** Blueprint Votes turn today's players into
  tomorrow's designers.
- **Built for the post:** Fast start, responsive controls, and no second account.

## Source references

- [Hackathon overview](https://redditgameswithahook.devpost.com/)
- [Official rules](https://redditgameswithahook.devpost.com/rules)
- [Devvit Rules](https://developers.reddit.com/docs/devvit_rules)
- [Building Community Games](https://developers.reddit.com/docs/guides/best-practices/community_games)
- [RAMAGEDDON asset and license ledger](https://github.com/BoneShaman/RAMAGEDDON/blob/main/docs/ASSET_LEDGER.md)
