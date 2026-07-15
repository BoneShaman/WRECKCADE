# WRECKCADE

**The horde is the weapon. Wrecks become weapons.**

WRECKCADE is a compact top-down destruction-derby survivor built for Reddit
with Phaser and Devvit Web. You drive into a collapsing arena, outmaneuver an
ever-thickening swarm, and turn a clean ram into high-speed kinetic ammunition.
A ram-destroyed vehicle launches as a hot wreck through its pursuers; each
impact can create the next hot wreck until one collision becomes an absurd
cascade.

The game is for players who want a fast, readable action run and for Reddit
communities that want a reason to compare, collaborate, and return tomorrow.
The solo run is the ignition; the shared daily **Wreckpile**, crew competition,
leaderboards, and **Blueprint Vote** are the engine around it.

> **Competition-build status:** the playable three-minute run, hot-wreck propagation
> system, ten-upgrade pool, three crews, daily challenge, Wreckpile,
> leaderboards, profiles/streaks, and Blueprint Vote are implemented. The Phaser
> client and Hono/Redis server pass type-check, lint, and production build.
> Controlled playtesting reached first impact in under five seconds, first
> level-up at 21.6 seconds, and a confirmed x21 wreck combo/cascade with 18 hot
> wrecks active simultaneously. Devvit CLI verification reports version 0.0.8
> installed to the public demo subreddit. A visibly signed-out browser opened
> the exact WRECKCADE post, confirmed its `0-0-8-webview`, rendered the live
> splash, launched **WRECK THE HORDE**, and reached the generated-car Crew Garage
> inside the Reddit modal. The public repository is renamed to WRECKCADE and its
> fetch/push origin is verified; pushing the current tree, correcting the
> app-profile display name, refreshing Devpost, and completing a live mobile
> 0.0.8 run remain tracked in
> [the competition checklist](docs/COMPETITION_CHECKLIST.md).

## The hook: wrecks become weapons

Most arena survivors treat a defeated enemy as subtraction. WRECKCADE turns it
into multiplication: one wreck can tear through the cars behind it and launch a
chain that changes the entire fight.

1. **Drive the line.** Thread through traffic, bait charges, sideswipe weak
   enemies, and avoid getting boxed in.
2. **Make a wreck.** Vehicles destroyed by a ram or an already-hot wreck inherit
   impact direction and momentum as short-lived, damaging wreck projectiles.
3. **Weaponize the swarm.** Aim the first collision through clustered pursuers
   and trigger violent cascades.
4. **Build the car.** Collect scrap/XP and choose upgrades that change handling,
   survivability, ramming, and automatic weapons.
5. **Survive the escalation.** Threat density, specialist enemies, and arena
   pressure rise until the run ends in glory or a glorious pile-up.

That is the central decision engine: enemy density is both the threat and the
ammunition. Better lines create larger wreck cascades, more scrap, more heat,
and bigger scores.

## How to play

The control set is deliberately small:

| Action                                  | Keyboard                                               | Pointer / touch                                       |
| --------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Steer                                   | `A` / `D` or left/right arrows                         | Hold or drag across the fixed left steering wheel     |
| Throttle / reverse                      | `W` / `S` or up/down arrows                            | Hold the right shifter for throttle                   |
| Handbrake drift                         | `Space` or left `Shift`                                | Slide the held shifter left; throttle remains engaged |
| Choose crew, upgrade, or Blueprint Vote | `1`, `2`, or `3`; crew also supports left/right arrows | Tap the stamped plate                                 |
| Pause / resume                          | `P`                                                    | Tap **PAUSE**                                         |
| Sound on/off                            | `M`                                                    | Tap **SOUND**                                         |
| Fullscreen                              | `F`                                                    | —                                                     |
| Start                                   | `Enter` or `Space`                                     | Tap the primary ignition plate                        |
| Replay after a run                      | `R` or `Enter`                                         | Tap **Run It Back**                                   |
| Delete stored player data from garage   | Press `D` twice within five seconds                    | Tap **Privacy: Delete My Data** twice                 |

Weapons fire automatically so attention stays on driving, momentum, drift
angles, and lining one wreck up with the next victim.

### A strong first run

- Keep moving. A stopped car is a voting booth where every enemy votes “ram.”
- Clip light enemies with the front corner rather than accepting a head-on hit.
- Put multiple enemies behind the car you are about to destroy; the launch angle
  matters more than the first kill.
- Release a handbrake drift into a straight line for a small speed kick.
- Pick upgrades that reinforce a plan instead of collecting unrelated stats.

## Why it belongs on Reddit

WRECKCADE is designed as asynchronous community play, not a web game with a
leaderboard stapled on afterward.

- **Daily Wreckpile:** everyone tackles the same server-generated daily seed.
  Each player's best daily scrap advances the shared tier, while their best
  wreck count raises the community total. Many short sessions become one visible
  event.
- **Crews:** players choose a crew and contribute run score toward a daily crew
  showdown. The individual run remains fun at low population; rivalry scales as
  the community grows.
- **Daily leaderboard and personal bests:** a fresh board creates a new race
  every day while personal bests preserve mastery goals.
- **Blueprint Vote:** players vote between three safe, pre-authored garage
  blueprints. The winning blueprint becomes the next day's community-wide
  starting upgrade.
- **No coerced sharing:** WRECKCADE does not post or comment on a player's
  behalf, and posting or subscribing is never required for progress.

These systems use Devvit server endpoints and Redis. The competition build must
not depend on an external game host or an off-platform leaderboard.

## Run locally and on Devvit

### Requirements

- Node.js `22.2.0` or newer
- npm
- A Reddit account enrolled at [Reddit for Developers](https://developers.reddit.com/)
- Moderator access to a small test subreddit for Devvit playtesting

### Install and verify

```sh
npm install
npm run type-check
npm run lint
npm run build
```

`npm run type-check` runs TypeScript's build check. Linting is a separate
command and should be run explicitly.

### Playtest inside Reddit

```sh
npm run login
npm run dev
```

`npm run dev` starts `devvit playtest`; follow the CLI prompt to select the test
subreddit and open the generated post. Devvit context, identity, Redis, and
expanded-mode behavior should be tested here—not only in a standalone browser.

### Upload and publish

```sh
npm run deploy
npm run launch
```

- `npm run deploy` verifies, lints, builds, and uploads a new app version.
- `npm run launch` uploads and submits the version for Reddit app review.
- The app name in `devvit.json` must be a real, unique Devvit app name before
  either command is used.

Publishing is an external account action. Do not put credentials in this
repository. The live app, subreddit, and post links are recorded in
[the submission guide](docs/SUBMISSION.md);
final judge-access and Devpost submission checks still require the entrant
account.

## Architecture

```text
Reddit interactive post
  ├─ inline splash / launch surface
  └─ expanded Devvit Web view
       └─ Phaser client (`src/client`)
            └─ `/api/*` requests
                 └─ Hono server (`src/server`)
                      ├─ authenticated Reddit context
                      └─ Devvit Redis persistence
```

- `src/client/` contains the splash, responsive shell, Phaser 4 Canvas
  bootstrap, fixed-step simulation, generated sprite/environment atlases,
  procedural semantic overlays and effects, input, hybrid WebAudio/original
  sample playback, combat presentation, and community screens.
- `src/server/` contains Hono endpoints, Reddit/Devvit integration, validation,
  Redis transactions, persistence, post creation, and triggers.
- `src/shared/` contains request and response types shared across the boundary.
- `devvit.json` declares the post entrypoints, server, menus, triggers, and app
  capabilities.
- Vite builds both sides into `dist/`; Devvit hosts the resulting webview and
  server functions.

The server derives identity and the UTC daily key from Devvit context, validates
strict request shapes and numeric bounds, and uses Redis transactions plus
per-player locks for shared records. The browser still simulates the action run,
so these checks are input hardening rather than replay-authoritative anti-cheat.

## Data and privacy

WRECKCADE is designed to use only the minimum Reddit data needed to operate the
game:

- Reddit-provided username and opaque account ID; current post/subreddit context
  scopes the session and shared challenge
- run score and summary statistics
- personal-best and daily-leaderboard records
- crew choice and aggregate crew contribution
- one current Blueprint Vote selection per eligible daily voting window
- daily Wreckpile aggregate contribution

The competition build stores these records in Devvit Redis. Player profiles are
keyed by Reddit's opaque account ID rather than by username and expire 30 days
after the latest saved run. Player-scoped daily records, leaderboard entries,
and Blueprint Vote selections expire after 16 days. WRECKCADE does not request
or store Snoovatar URLs, passwords, email addresses, real names, or payment
information, and it does not send gameplay or identity data to an external
analytics or leaderboard service. Public boards may display the Reddit username
already associated with the play session, score, crew, and contribution.

Players can delete their stored WRECKCADE data directly from the Crew Garage:
press `D` twice within five seconds or tap **Privacy: Delete My Data** twice. The
action removes the account-keyed profile, retained player-scoped daily records,
leaderboard positions, and daily Blueprint Vote selections. Shared crew and
Wreckpile totals contain no username or account ID and may remain as anonymous
community aggregates. WRECKCADE does not create comments or posts as the
player. Automatic platform account-deletion behavior must still be verified
against the current [Devvit Rules](https://developers.reddit.com/docs/devvit_rules)
before a public app-directory launch.

If external fetch, user-posting, or additional personal-data collection is added
later, the app will require the relevant consent, policy, and Reddit approval
work.

## Accessibility and comfort

The current build is playable without audio, provides keyboard and touch
pause/sound controls, uses text alongside color for critical state, and supports
keyboard and touch driving. Release QA verifies the 613×512 feed card and
333×515 expanded layouts without clipping or inline scrolling, plus parity
between WASD and arrow-key driving, visible `1`/`2`/`3` upgrade shortcuts, and
simulated two-thumb steering-wheel/shifter input for throttle, drift, pause,
sound, card selection, and replay. The official browser client and focused smoke
suite pass with no application-console errors. The final balance matrix rejects
constant-turn driving across every daily variant, while an offense-prioritized
active policy destroyed the Road King at 175.03 seconds; focused QA confirms the
boss kill now resolves victory immediately instead of exposing the winner to a
post-kill traffic death.

Buttons are labeled, keyboard actions have visible focus treatment, critical
health/XP/timer/upgrade information remains high contrast, and camera trauma
and hit-stop are bounded. The current build does not claim a dedicated
reduced-effects mode. A signed-out desktop exact-link launch is verified; native
Reddit mobile-client and logged-in ordinary-user runs remain release-gate items
and are not implied by the exact-viewport browser checks.

## Support and reports

Report a gameplay, safety, or privacy problem by sending Modmail to the
subreddit that hosts the WRECKCADE post. Include the app version, device,
browser/Reddit client, and steps to reproduce, but do not include credentials or
other sensitive information. If the optional public repository is linked, its
issue tracker may also be used for reproducible technical defects.

## Licensing and credits

- Project code is distributed under the BSD 3-Clause terms in
  [LICENSE](LICENSE), matching `package.json`.
- The app uses [Phaser](https://phaser.io/),
  [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview),
  [Hono](https://hono.dev/), [Vite](https://vite.dev/), and
  [TypeScript](https://www.typescriptlang.org/); their respective licenses and
  notices remain with those projects.
- The repository began from Reddit's Devvit Phaser starter. Its copyright and
  BSD notice must be retained wherever that license requires.
- WRECKCADE combines code-controlled hitboxes, attachments, combat feedback,
  HUD, and controls with six entrant-directed image-generated runtime assets: a
  patched arena floor, demolition-garage backdrop, drive-over decals, scrapyard
  landmarks, nine vehicle models with four damage states each, and a
  barrel/blast/repair atlas. The final WebP assets total roughly 1.62 MB and
  were generated without reference images, chroma-keyed where transparency was
  needed, normalized into stable frames, visually inspected, and integrated as
  responsive game-space art; exact prompts and processing are recorded in
  [`docs/VISUAL_PROVENANCE.md`](docs/VISUAL_PROVENANCE.md). Its audio combines
  runtime WebAudio synthesis with original SFX
  layers generated locally using Stable Audio 3 and edited specifically for the
  game. No stock recordings or third-party sound-library files are included;
  exact prompts, seeds, and processing are recorded in
  [`docs/AUDIO_PROVENANCE.md`](docs/AUDIO_PROVENANCE.md).
- The Reddit app icon is a separately generated, entrant-directed marketing
  asset recorded in the license ledger; it is not loaded by the game runtime.
- Reference captures, third-party game art, external logos, Reddit trademarks,
  and Snoo artwork are **not** submission assets and must not be present in the
  built client without explicit written permission.

The current creator/source/license record is maintained in the
[asset and license ledger](docs/ASSET_LEDGER.md).
Add any later music, footage, font, artwork, or other submitted component to
that ledger before release.

## Submission materials

- [Ready-to-paste Devpost copy and 60-second video plan](docs/SUBMISSION.md)
- [Deadline, eligibility, compliance, and external-account checklist](docs/COMPETITION_CHECKLIST.md)
- [Production asset and dependency license ledger](docs/ASSET_LEDGER.md)

Live competition links:

- Technical app listing (display-name correction pending): <https://developers.reddit.com/apps/ramageddon-game>
- Demo subreddit: <https://www.reddit.com/r/ramageddon_game_dev>
- Running WRECKCADE post: <https://www.reddit.com/r/ramageddon_game_dev/comments/1uwzwl3/wreckcade_daily_wreckpile/>
- Public source (repository rename verified; current tree push pending): <https://github.com/BoneShaman/WRECKCADE>
- Privacy-policy target pending current-tree push: <https://github.com/BoneShaman/WRECKCADE/blob/main/docs/PRIVACY.md>
- Terms target pending current-tree push: <https://github.com/BoneShaman/WRECKCADE/blob/main/docs/TERMS.md>
