# RAMAGEDDON

**The horde is the weapon. Wrecks become weapons.**

RAMAGEDDON is a compact top-down destruction-derby survivor built for Reddit
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
> wrecks active simultaneously. Devvit version 0.0.1 is uploaded and running in
> the linked Reddit post. Judge-access testing and the external Devpost entry
> remain tracked in [the competition checklist](docs/COMPETITION_CHECKLIST.md).

## The hook: wrecks become weapons

Most arena survivors treat a defeated enemy as subtraction. RAMAGEDDON turns it
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

| Action                                  | Keyboard                                               | Pointer / touch                                                           |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| Throttle / reverse / steer              | `WASD` or arrow keys                                   | Drag the left virtual stick: vertical is throttle, horizontal is steering |
| Handbrake drift                         | `Space`                                                | Hold the right-side drift button                                          |
| Choose crew, upgrade, or Blueprint Vote | `1`, `2`, or `3`; crew also supports left/right arrows | Tap the card                                                              |
| Pause / resume                          | `P`                                                    | —                                                                         |
| Sound on/off                            | `M`                                                    | —                                                                         |
| Fullscreen                              | `F`                                                    | —                                                                         |
| Start                                   | `Enter` or `Space`                                     | Tap the primary button                                                    |
| Replay after a run                      | `R` or `Enter`                                         | Tap **Run It Back**                                                       |
| Delete stored player data from garage   | Press `D` twice within five seconds                    | Tap **Privacy: Delete My Data** twice                                     |

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

RAMAGEDDON is designed as asynchronous community play, not a web game with a
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
- **No coerced sharing:** RAMAGEDDON does not post or comment on a player's
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
[the submission guide](docs/SUBMISSION.md); final judge-access and Devpost
submission checks still require the entrant account.

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
  bootstrap, fixed-step simulation, procedural vector rendering, input,
  synthesized WebAudio, combat presentation, and community screens.
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

RAMAGEDDON is designed to use only the minimum Reddit data needed to operate the
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
and Blueprint Vote selections expire after 16 days. RAMAGEDDON does not request
or store Snoovatar URLs, passwords, email addresses, real names, or payment
information, and it does not send gameplay or identity data to an external
analytics or leaderboard service. Public boards may display the Reddit username
already associated with the play session, score, crew, and contribution.

Players can delete their stored RAMAGEDDON data directly from the Crew Garage:
press `D` twice within five seconds or tap **Privacy: Delete My Data** twice. The
action removes the account-keyed profile, retained player-scoped daily records,
leaderboard positions, and daily Blueprint Vote selections. Shared crew and
Wreckpile totals contain no username or account ID and may remain as anonymous
community aggregates. RAMAGEDDON does not create comments or posts as the
player. Automatic platform account-deletion behavior must still be verified
against the current [Devvit Rules](https://developers.reddit.com/docs/devvit_rules)
before a public app-directory launch.

If external fetch, user-posting, or additional personal-data collection is added
later, the app will require the relevant consent, policy, and Reddit approval
work.

## Accessibility and comfort

The current build is playable without audio, provides `M` mute and `P` pause,
uses text alongside color for critical state, and supports keyboard and touch
driving. The uploaded post still needs the following final checks:

- readable text and controls at Reddit's mobile and desktop post sizes
- keyboard and touch completion of the full run and all card/button choices
- labeled buttons, visible focus treatment, and a persistent control reminder
- high-contrast health, XP, timer, and upgrade information
- restrained flashing and bounded camera shake; the current build does not
  claim a dedicated reduced-effects mode
- pause behavior that does not punish the player

Accessibility claims belong in the submission only after they are exercised in
the uploaded Reddit post.

## Support and reports

Report a gameplay, safety, or privacy problem by sending Modmail to the
subreddit that hosts the RAMAGEDDON post. Include the app version, device,
browser/Reddit client, and steps to reproduce, but do not include credentials or
other sensitive information. If the optional public repository is linked, its
issue tracker may also be used for reproducible technical defects.

## Licensing and credits

- Project code is distributed under the BSD 3-Clause terms in [LICENSE](LICENSE),
  matching `package.json`.
- The app uses [Phaser](https://phaser.io/),
  [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview),
  [Hono](https://hono.dev/), [Vite](https://vite.dev/), and
  [TypeScript](https://www.typescriptlang.org/); their respective licenses and
  notices remain with those projects.
- The repository began from Reddit's Devvit Phaser starter. Its copyright and
  BSD notice must be retained wherever that license requires.
- Active RAMAGEDDON production visuals are drawn procedurally with Phaser
  Graphics, and its engine, collision, pickup, weapon, and impact sounds are
  synthesized at runtime with WebAudio. No generated or third-party production
  game assets are referenced by the active runtime.
- The Reddit app icon is a separately generated, entrant-directed marketing
  asset recorded in the license ledger; it is not loaded by the game runtime.
- Reference captures, third-party game art, external logos, Reddit trademarks,
  and Snoo artwork are **not** submission assets and must not be present in the
  built client without explicit written permission.

The current creator/source/license record is maintained in the
[asset and license ledger](docs/ASSET_LEDGER.md). Add any later music, footage,
font, artwork, or other submitted component to that ledger before release.

## Submission materials

- [Ready-to-paste Devpost copy and 60-second video plan](docs/SUBMISSION.md)
- [Deadline, eligibility, compliance, and external-account checklist](docs/COMPETITION_CHECKLIST.md)
- [Production asset and dependency license ledger](docs/ASSET_LEDGER.md)

Live competition links:

- App listing: <https://developers.reddit.com/apps/ramageddon-game>
- Demo subreddit: <https://www.reddit.com/r/ramageddon_game_dev>
- Running demo post: <https://www.reddit.com/r/ramageddon_game_dev/comments/1uws1an/ramageddon_daily_wreckpile/>
- Public source: <https://github.com/BoneShaman/RAMAGEDDON>
- Privacy policy: <https://github.com/BoneShaman/RAMAGEDDON/blob/main/docs/PRIVACY.md>
- Terms: <https://github.com/BoneShaman/RAMAGEDDON/blob/main/docs/TERMS.md>
