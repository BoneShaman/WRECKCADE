Original prompt: Work all the way through into an incredibly fun and awesome juicy style destruction derby vampire survivors esque vibe for the Reddit Games with a Hook competition. Make creative decisions, iterate until polished, validated, and ready to publish.

# RAMAGEDDON progress

## Product truth

- Competition runtime: Devvit Web interactive post, Phaser client, Hono server, Redis persistence.
- Immediate hook: **Wrecks become weapons.** Momentum-driven nose rams launch destroyed cars as spinning projectiles that can chain-wreck the swarm.
- Reddit-native hook: one seeded arena each day; three crews compete; personal and daily leaderboards; each player's best daily scrap feeds a shared Wreckpile; end-of-run blueprint votes decide tomorrow's community upgrade.
- Style bible: Saturday-night scrapyard comic. Asphalt navy, rust orange, toxic cyan, warning yellow, chunky outlines, hazard stripes, hard shadows.
- Run target: a compact three-minute session with first hit under five seconds, first upgrade around twenty seconds, and a boss climax.

## 2026-07-15

- Forensic audit: workspace initially contained only an incomplete captured Vampire Survivors reference page. It is excluded from the authored game and must never be shipped or credited as production code.
- Competition audit: standalone hosting is ineligible. Devvit Web post, README, developer app listing, and public demo subreddit/post are required. Deadline is 2026-07-16 11:00 AEST.
- Installed the official Reddit Phaser Devvit template into the current workspace (without its Git history or template AGENTS file).
- Current work: replacing template UI/game/backend with RAMAGEDDON.
- First full authored playable landed: fixed-step arcade driving, responsive drift, momentum/angle rams, hot wreck projectiles and chain crashes, five enemy tiers, three-minute director and Road King boss, XP/cards, ten upgrade paths, visible attachments, overdrive, synthesized audio, touch controls, results/voting, and test-state hooks.
- Redis backend landed: daily challenge seed, profiles/streaks, daily/personal bests, crews, shared Wreckpile tiers, leaderboard, previous-day blueprint effect, and explicit player vote.
- Inline feed launch screen landed and was visually verified at desktop and mobile sizes.
- Local production build/type-check/lint pass. Canvas-renderer Playwright loops verify driving, drift, damage, first impact, 21-car chain cascade, scrap collection, and first level-up at 21.6 seconds.
- Visual QA fix: reduced chain-callout clutter and separated controls help from the overdrive meter.
- Final local QA pass: build, TypeScript, and ESLint all pass; focused smoke coverage verifies acceleration, pause/freeze/resume, mute, boss spawn, victory, blueprint voting, replay reset, defeat, and mobile layout with zero browser errors.
- Devvit CLI authenticated as `u/BoneShaman`; the one-time developer enrollment and account setup are complete.
- Release hardening landed: live initialization gates the start button; delayed run saves cannot resurrect stale result screens; run/vote sync is truthful and retryable; the Crew Garage and results now expose personal bests, streaks, career wrecks, crew standings, Wreckpile totals, and exact contribution deltas.
- Daily variety is now mechanical rather than descriptive: five arena layouts alter bounds, lanes, killboxes, pillars, wreck lifetime, and spawn geometry; all six daily modifiers alter driving, pickups, damage, hazards, scoring, or elite explosions. Deterministic browser coverage exercises every arena/modifier path.
- Privacy hardening landed: opaque Reddit user IDs key player profiles, unused Snoovatar collection was removed, profiles expire after 30 days, daily player records expire after 16 days, and a two-step in-game delete action removes retained player-scoped records and public board membership.
- Mobile hardening landed: portrait Crew Garage/results layouts, touch pause/mute controls, pointer-cancel cleanup, and drift-pointer ownership. Desktop/mobile layout screenshots and interaction smoke tests pass without browser errors.
- Road King readability pass landed: a visible charge wind-up, warning lane, braking anticipation, and heavier launch feedback replace the former instant charge. Local QA god mode no longer mutates visible BODY totals.
- Release metadata and evidence were corrected: version 1.0.0, accurate combo/cascade language, original-code asset ledger, entrant copyright notice, and explicit source exclusions for local reference/starter assets. The production bundle contains no reference or starter artwork.
- Current automated release gate: TypeScript, ESLint, and Vite build pass; the official web-game client passes; focused smoke covers start/drive/pause/mute/boss telegraph/victory/vote/replay/defeat/mobile controls; mocked Devvit tests cover slow init and delayed-save races.
- Final resilience pass: all client API calls now time out into recoverable fallback/retry states; zero-score daily submissions still lock crew allegiance correctly; install-trigger post creation uses an atomic expiring claim; cached noise synthesis plus a compressor reduces cascade-time audio allocations and clipping.
- Final input audit found and repaired a modal-specific keyboard trap: raw lifecycle-safe hotkeys now make repeated pause/resume, mute, upgrade selection, replay, and retry reliable even while simulation time is stopped. Focused DOM-event proof and the full smoke suite pass.
- Final exact-build rerun is green: official interaction client, all five arenas, all six modifiers, zero-score allegiance, slow live initialization, API timeout recovery, delayed save, immediate replay race, desktop results, portrait menu/results, boss telegraph, and touch pause/mute.
- Reddit live setup: the original `ramageddon` technical slug was already taken; `ramageddon-game` passed Reddit's uniqueness check and is now the manifest app name.
- Live milestone: Devvit version 0.0.1 uploaded successfully, installed to `r/ramageddon_game_dev`, and created the working `RAMAGEDDON: Daily Wreckpile` interactive post. The feed splash is rendering with live daily arena/modifier/community state.
- First deployed run proof: the live Reddit modal completed a real mobile-sized run at 1,486 score, 9 wrecks, x7 best combo, and 18 scrap; the server synced the run to the Wreckpile/leaderboard/profile and accepted a Mag-Crane Blueprint Vote. The feed card immediately reflected 18 community scrap and the new pit leader.
- Final pre-release integrity pass: failed Reddit initialization now enters an explicitly labeled local Practice mode that never claims to sync scores or votes. Touch play now includes visible DRIVE/DRIFT labels, a seven-second gesture prompt, larger PAUSE/SOUND targets, and pointer ownership fixes. Exact 333×515 menu, gameplay, and result captures are clean with zero console errors; TypeScript, ESLint, Prettier, production build, and the official Playwright game client all pass.
- Exact Reddit-viewport repair: live inspection exposed a clipped 613×512 feed hero and overlapping 333×515 garage/result text. Dedicated short-card/narrow-modal layouts now keep the logo, daily state, cards, voting, sync retry, and actions readable at those sizes.
- Listing art: an original no-text collision icon was generated from an entrant-directed prompt, resized to 1024×1024, palette-compressed below 500 KB, recorded in the asset ledger, and wired through `marketingAssets.icon`.

## Active TODO

- Upload and revalidate the hardened final build after the exact-viewport and integrity fixes.
- Make the dedicated demo subreddit judge-accessible and verify the exact post while signed out.
- Capture final live media and complete the external Devpost form before the deadline.
