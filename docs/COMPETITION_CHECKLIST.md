# RAMAGEDDON Competition Checklist

Use this as the release gate for Reddit's Games with a Hook Hackathon. The
[official rules](https://redditgameswithahook.devpost.com/rules) control if any
summary here conflicts with the live competition page.

## Deadline — do not miss this

**Submission closes Wednesday, July 15, 2026 at 6:00pm PDT.**

- UTC: Thursday, July 16, 2026 at 01:00
- Brisbane/AEST: Thursday, July 16, 2026 at 11:00am
- Feedback-prize form: same deadline
- Judging: July 16 at 12:00am through July 27 at 6:00pm PDT
- Keep the game free, working, and accessible through the end of judging:
  Tuesday, July 28, 2026 at 11:00am Brisbane/AEST
- Winners: on or around July 29, 2026 at 3:00pm PDT

Submit early enough to reopen the entry, test every public link while signed
out, and correct mistakes. Once the Submission Period ends, the official entry
cannot normally be changed.

## Verified repository evidence

The following is implemented and locally verified; it does not replace the
external uploaded-post checks later in this document.

- [x] Phaser 4 Canvas game runs a fixed-step, responsive three-minute derby
      survivor with desktop and touch controls.
- [x] Ram-launched hot wrecks inherit collision momentum and damage the cars
      behind them; controlled playtesting confirmed an x21 wreck combo/cascade
      with 18 hot wrecks active simultaneously.
- [x] First impact occurs in under five seconds and the first verified level-up
      occurred at 21.6 seconds.
- [x] XP/upgrades, three crews, specialist waves, Road King boss, overtime,
      results, replay, sound toggle, pause, and fullscreen are implemented.
- [x] Server-derived daily seed/modifier, profiles, streaks, Wreckpile, crew
      standings, leaderboard, and Blueprint Vote use Hono plus Devvit Redis.
- [x] Active production visuals are procedural Phaser Graphics and active audio
      is synthesized WebAudio; the runtime does not reference generated or
      third-party production game assets.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` pass.
- [x] Devvit 0.0.1 is uploaded, installed, and rendering its interactive launch
      surface in the generated Reddit post.
- [ ] Public/signed-out access, multi-account Redis verification, mobile Reddit
      verification, live-post media, and Devpost submission remain.

## Required submission bundle

| Requirement                                            | Evidence                                                                                    | Done |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---- |
| Joined hackathon from eligible Devpost account         | Devpost participant/dashboard view                                                          | [ ]  |
| Game built with Reddit Developer Platform / Devvit Web | Uploaded app runs in Reddit post                                                            | [x]  |
| All required Devpost fields completed in English       | Final entry preview                                                                         | [ ]  |
| Feature/functionality text description                 | Copy verified against uploaded build                                                        | [ ]  |
| Unique Devvit app listing                              | `https://developers.reddit.com/apps/ramageddon-game`                                        | [x]  |
| Demo subreddit                                         | `https://www.reddit.com/r/ramageddon_game_dev`                                              | [x]  |
| Accessible post running the actual game                | `https://www.reddit.com/r/ramageddon_game_dev/comments/1uws1an/ramageddon_daily_wreckpile/` | [ ]  |
| Detailed root `README.md` describing game and play     | This repository's `README.md`                                                               | [x]  |
| App remains free and unrestricted through judging      | Signed-out/judge-access test                                                                | [ ]  |
| Rights cleared for every submitted component           | [Asset/source/license ledger](ASSET_LEDGER.md) plus entrant attestation                     | [ ]  |
| Optional public video under one minute                 | `[DEMO_VIDEO_URL]`                                                                          | [ ]  |
| Optional public source repository                      | `[PUBLIC_REPOSITORY_URL]`                                                                   | [ ]  |
| Optional actionable Devvit feedback form               | Submitted-form confirmation                                                                 | [ ]  |

The rules recommend a judging post in a **public subreddit with fewer than 200
members**. If the subreddit is not public, install Reddit's
[Admin Approval app](https://developers.reddit.com/apps/dr-admin-approve) so
judges can enter. The lower-risk path is a small, public, dedicated demo
subreddit and a public post tested from an unrelated account.

## External account actions

These steps require the entrant's Reddit/Devpost identity and cannot be
completed by repository code alone.

### Devpost

- [ ] Sign in to the entrant's Devpost account.
- [ ] Click **Join Hackathon** on the
      [competition page](https://redditgameswithahook.devpost.com/).
- [ ] Confirm the entrant/team/organization is eligible.
- [ ] If entering as a team or organization, appoint one eligible representative
      authorized to submit for everyone.
- [ ] Create or open the RAMAGEDDON project before the deadline.
- [ ] Paste only claims that pass `docs/SUBMISSION.md`'s claims gate.
- [ ] Add the app listing, demo subreddit, and running post links.
- [ ] Add the optional public video and repository links if they improve the
      entry and are safe to publish.
- [ ] Preview the complete submission in English.
- [ ] Submit; do not leave the entry as a draft.
- [ ] Capture the submission confirmation and final public/project URL.

### Reddit and Devvit

- [x] Enroll the entrant's Reddit account at
      [developers.reddit.com](https://developers.reddit.com/).
- [ ] Create a dedicated, public demo subreddit with fewer than 200 members, or
      configure judge access with `dr-admin-approve`.
- [x] Give the entrant account moderator permission needed to install/playtest.
- [x] Repository and Devvit configuration use the RAMAGEDDON name and original
      copy; no template name placeholder remains.
- [x] Reddit rejected the taken `ramageddon` slug; `ramageddon-game` passed the
      live uniqueness check and is now the technical Devvit app name. The
      player-facing title remains **RAMAGEDDON**.
- [x] Authenticate the local CLI with `npm run login` (`u/BoneShaman`).
- [x] Install the uploaded app to the dedicated playtest subreddit.
- [ ] Test the generated post as developer, moderator, and ordinary user.
- [x] Upload the known-good build as Devvit version 0.0.1.
- [x] Copy the resulting `developers.reddit.com/apps/{app-name}` listing URL.
- [x] Create a clean demonstration post that launches the uploaded version.
- [ ] Open the post from a separate, non-moderator Reddit account.
- [ ] If seeking normal public distribution, submit with `npm run launch` and
      monitor Reddit app review. Do not assume review will finish before the
      hackathon deadline.

### Public video, optional but recommended

- [ ] Capture only the actual submitted Reddit-post build.
- [ ] Keep total duration below 60 seconds; aim for 56–58 seconds.
- [ ] Show the post context, core wreck-as-weapon mechanic, upgrade choice,
      community loop, and mobile fit.
- [ ] Add accurate captions and mix dialogue above effects.
- [ ] Verify rights for music, fonts, sound, footage, and artwork.
- [ ] Upload publicly to YouTube, Vimeo, Facebook Video, or Youku.
- [ ] Watch the complete public video while signed out.
- [ ] Copy the final public URL into Devpost.

## Eligibility and ownership gate

- [ ] Every individual entrant is at least the age of majority where they live.
- [ ] No entrant is a resident of, and no organization is domiciled in, an
      excluded jurisdiction. The rules expressly list Brazil, Quebec, Russia,
      Crimea, Cuba, Iran, North Korea, Syria, OFAC-designated places, and any
      location where participation or receipt of a prize is prohibited.
- [ ] No entrant is disqualified through sponsor/administrator employment,
      judging, close family/household ties, affiliation, or another conflict.
- [ ] RAMAGEDDON was newly created or significantly updated after June 17, 2026.
- [ ] If it existed earlier, the Devpost description clearly identifies the
      significant changes made during the submission period.
- [ ] The project has not won a previous Reddit hackathon.
- [ ] It was not developed with Reddit/Devpost financial or preferential support
      that triggers the official-rules exclusion.
- [ ] The entrant owns or has sufficient license to every line of submitted code,
      image, texture, font, sound, track, video clip, logo, and written passage.
- [x] `package.json` and the root `LICENSE` both declare BSD-3-Clause.
- [ ] Contracted or AI-assisted work remains directed by the entrant and can be
      represented as the entrant's original project under the relevant licenses.
- [ ] A team/organization representative can verify each member's role if asked.
- [ ] Entrant understands one project can win only one competition prize.

## Product and judging gate

### Stage 1: viability and required platform

- [ ] The game launches and finishes a complete run in a Reddit Interactive Post.
- [x] The client is Devvit Web, not a teaser that links to an external full game.
- [x] Devvit is materially used for authenticated identity and shared Redis state.
- [x] The menu/results surface daily community mechanics without the README.
- [x] The experience has original procedural presentation and a distinct
      wreck-chain driving system—not renamed clone assets.
- [x] The “hook” is recurring community play and tomorrow's voted upgrade, not a
      literal hook gag.

### Delightful UX

- [x] The inline post has original, eye-catching art and one obvious primary
      action.
- [x] The player reaches first impact in under five seconds.
- [x] Controls are shown before the first dangerous moment.
- [x] Damage, danger, pickups, XP, upgrades, death, result, and retry are readable
      in the local verified path.
- [x] A verified x21 wreck combo/cascade with 18 simultaneous hot wrecks
      remained controllable and readable.
- [ ] Every button has hover/focus/pressed/disabled feedback where applicable.
- [ ] Empty, loading, offline, API-error, and duplicate-submission states have
      understandable messages and recovery paths.

### Polish

- [x] No template counter, generic menu, sample form, Snoo, or placeholder copy
      is referenced by the active application screens.
- [ ] No debug panel, fake score, private URL, broken image, overflowing text,
      or uncaught error appears in the demo.
- [ ] The uploaded version completes the same flow depicted in screenshots/video.
- [x] Gameplay remained stable through a controlled x21 wreck combo/cascade
      with 18 hot wrecks active simultaneously.
- [ ] A run can be retried repeatedly without duplicate listeners, stale state,
      or accumulating performance loss.
- [x] Server failure cannot freeze the core result screen or erase the local
      result before showing it.

### Reddit-y

- [x] Authenticated completed runs update Daily Wreckpile best contributions.
- [x] Three crews have distinct handling/performance perks and daily score totals.
- [x] Leaderboard entries derive identity from Reddit server context.
- [x] Blueprint Vote is constrained to three server-selected options; today's
      winner becomes tomorrow's community-wide starting upgrade.
- [x] The complete action run works offline/alone and shared state adds meaning as
      more players join.
- [x] Community contribution is celebrated in the launch/results presentation.

### Hook / retention

- [x] Today's server-seeded event has a visible modifier, Wreckpile goal, and
      community upgrade.
- [x] The daily board gives newcomers a fresh competitive start.
- [x] Personal bests, career totals, streaks, and upgrade mastery create longer
      goals.
- [x] Vote copy communicates that the selected blueprint affects tomorrow.
- [x] A missed day resets the displayed streak without locking content or
      progression.
- [x] The core run is three minutes, reaches first impact in under five seconds,
      and provides one-action replay.

### Phaser innovation

- [x] Cars destroyed by rams or already-hot wrecks become short-lived hot wreck
      projectiles whose inherited momentum and chain power cause real collision
      damage.
- [x] Collision behavior remained stable and understandable through a verified
      x21 wreck combo/cascade with 18 hot wrecks active simultaneously.
- [x] Enemy counts and transient object lifetimes are bounded; expired objects are
      removed from simulation arrays.
- [x] Hit-stop, camera trauma, particles, procedural animation, and synthesized
      WebAudio reinforce impact while
      preserving steering authority.
- [x] Responsive Canvas scaling, portrait card layouts, keyboard, and virtual
      touch controls are implemented for Devvit views.

## Technical verification

Run on a clean install:

```sh
npm install
npm run type-check
npm run lint
npm run build
```

- [x] Dependency install is present, and type-check, lint, and production build
      exit successfully.
- [x] There are no TypeScript, lint, build, or asset-resolution warnings that
      conceal a real defect.
- [x] The production `dist/client` contains only the RAMAGEDDON entrypoints,
      styles, scripts, source maps, and module preload helper; unused starter
      PNGs are not copied into the Devvit bundle.
- [x] Client fetches target only the app's `/api/init`, `/api/run`, `/api/vote`,
      and player-initiated `/api/profile` deletion endpoints.
- [x] Public server endpoints are under `/api/` and use bounded request bodies.
- [x] Shared records use Redis rather than `localStorage`; app updates do not wipe
      community progression.
- [x] The server derives Reddit identity, post/subreddit context, and current
      daily key from trusted context/time.
- [x] Run submission accepts only an exact field set with numeric bounds; the
      server supplies username and UTC daily scope. This is input hardening, not
      replay-authoritative anti-cheat.
- [x] Per-player request locks plus Redis transactions protect crew, vote,
      leaderboard, profile, and Wreckpile updates.
- [x] Run submissions have a daily cap, repeat votes are idempotent/changeable,
      bodies are capped, and API failures return constrained messages.
- [ ] Mobile and desktop frame rates remain playable during the densest intended
      scene.
- [ ] Browser console and Devvit server logs remain clean through two full runs.

Packaging/remnant search before upload:

```sh
rg -n '<% name %>|Increment|Decrement|Phaser - Template' \
  devvit.json package.json src
rg -n 'Vampire Survivors|poncle|snoo\.png|assets/bg\.png|assets/logo\.png' \
  src dist/client
find dist/client -maxdepth 2 -type f -print
```

The searches should return no shipped starter/reference copy. The current
production build excludes the unused starter PNGs from `dist/client`; remove
them before linking a public source repository if they would create ownership or
branding confusion. A local research capture outside `src/`, `public/`, and
`dist/` is not part of the client build, but do not publish or submit third-party
captures without permission.

## Devvit rules, privacy, and safety

- [x] The built app has an original name and branding; no Reddit, Snoo, or other Reddit
      trademark appears without written approval.
- [x] Active production rendering and audio are original procedural
      Phaser/WebAudio systems; the production bundle contains no generated or
      third-party production game assets.
- [x] The game does not link out to a fuller version on another platform.
- [x] Players are never asked for Reddit credentials or unnecessary personal data.
- [x] Only Reddit username, opaque account ID, and documented gameplay/community
      records are used; Snoovatar URLs are not requested or stored.
- [x] Publicly displayed username/score/crew behavior matches the README.
- [x] The app does not currently create score-share posts or comments.
- [x] Posting, commenting, voting, or subscribing is not required for game
      progress or access.
- [x] Free-form user text is absent; Blueprint options are predefined and safe.
- [x] A two-step in-game privacy action deletes the account-keyed profile,
      retained player-scoped daily records, leaderboard positions, and daily
      Blueprint Vote selections.
- [ ] Automatic Reddit account-deletion trigger behavior is implemented and
      verified as required by the current Devvit Rules for public launch.
- [x] No external fetch or off-platform personal-data service is used.
- [x] Destruction is abstract, vehicle-only, and stylized without gore; no
      prohibited harmful or graphic content is present.
- [x] The README directs gameplay, safety, and privacy reports to host-subreddit
      Modmail and the optional public issue tracker.

## Responsive and accessibility test matrix

| Environment                     | Run completed | Controls | UI fit | Shared state | Done |
| ------------------------------- | ------------- | -------- | ------ | ------------ | ---- |
| Reddit desktop, ordinary user   | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |
| Reddit desktop, moderator       | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |
| Narrow/mobile-sized Reddit view | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |
| Touch device, portrait          | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |
| Touch device, landscape         | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |
| Keyboard-only navigation        | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |
| Sound-muted full run            | [ ]           | [ ]      | [ ]    | [ ]          | [ ]  |

Also verify:

- [x] Splash and game shells explicitly disable inline scrolling and overscroll.
- [x] Critical gameplay state uses text/shape alongside color and does not require
      audio; `M` toggles all synthesized sound.
- [ ] Text remains legible without overlapping at the smallest supported size.
- [x] The launch button has labeled semantics plus visible hover, active, and
      `focus-visible` treatment; canvas choices also include number labels.
- [x] Camera trauma and hit-stop are bounded; no rapid full-screen flash system is
      used.
- [x] `P` pause stops simulation danger and engine audio.

## Final hour

- [ ] Freeze feature work; change only submission blockers.
- [ ] Upload one final known-good build.
- [ ] Record its app version and time.
- [ ] Complete one ordinary-user desktop run from the exact demo link.
- [ ] Complete one touch/mobile run from the exact demo link.
- [ ] Confirm leaderboard, crew, Wreckpile, and vote updates from two accounts.
- [ ] Open every Devpost link while signed out.
- [ ] Verify the video is public and under one minute.
- [ ] Re-read the final description against the visible build.
- [ ] Submit the Devpost entry and save confirmation evidence.
- [ ] Do not remove access or introduce incompatible updates during judging.

## Authoritative references

- [Competition overview](https://redditgameswithahook.devpost.com/)
- [Official rules](https://redditgameswithahook.devpost.com/rules)
- [Competition schedule](https://redditgameswithahook.devpost.com/details/dates)
- [Devvit Web overview and runtime limits](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview)
- [Devvit Rules](https://developers.reddit.com/docs/devvit_rules)
- [Launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide)
- [Building Community Games](https://developers.reddit.com/docs/guides/best-practices/community_games)
