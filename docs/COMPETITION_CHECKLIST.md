# WRECKCADE Competition Checklist

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
- [x] Active production visuals combine Phaser-controlled hitboxes, combat,
      attachments, HUD, controls, and semantic UI with six entrant-directed
      image-generated runtime WebPs covering the environment, nine cars with
      staged damage, barrels, blasts, and repair cases; visual prompts and
      processing are documented in `docs/VISUAL_PROVENANCE.md`. Active audio
      combines responsive WebAudio synthesis with entrant-directed local Stable
      Audio 3 SFX; prompts, seeds, processing, and rejected clips are documented in
      `docs/AUDIO_PROVENANCE.md`, with no stock-library audio included.
- [x] `npm run type-check`, `npm run lint`, and `npm run build` pass.
- [x] Devvit 0.0.8 is uploaded and installed to `r/ramageddon_game_dev`; the CLI
      install listing confirms it as the active version.
- [x] A prior live desktop-browser validation confirmed the 0.0.5
      `0-0-5-webview` with real daily/community state. That production run
      started with active audio and produced an x7 opening wreck cascade; the
      preceding 0.0.2 audit entered a run and reached the first upgrade without
      a visible client error.
- [x] Current 0.0.8 local QA covers exact 613×512 and 333×515 layouts, WASD/arrow
      parity, visible `1`/`2`/`3` upgrade shortcuts, simulated two-thumb
      steering-wheel/throttle-drift-shifter input, generated vehicle damage
      states, barrel chains, sparse repairs, and the Road King victory path.
- [x] Twelve constant-turn exploit runs across all six modifiers and five arenas
      produced zero wins. An offense-prioritized active policy destroyed the
      Road King at 175.03 seconds; the boss kill now ends the run immediately,
      and its focused 150.2-second QA branch reaches the result state without an
      error.
- [x] Reddit approved the demo community as Public. A visibly signed-out in-app
      browser opened the exact **WRECKCADE: Daily Wreckpile** post, confirmed
      its iframe source contains `0-0-8-webview`, rendered the WRECKCADE splash,
      activated **WRECK THE HORDE**, and reached the generated-car Crew Garage
      inside the Reddit modal.
- [x] Devpost submission completed July 15, 2026 at approximately 1:43pm AEST;
      the confirmation banner, **SUBMITTED TO** state, 11-image gallery, and
      public unauthenticated project URL were verified.
- [x] The final Devpost refresh displays **WRECKCADE**, the final story and links,
      11 new captioned images, and **SUBMITTED TO** status. A signed-out public
      visual audit confirmed the legacy `/software/ramageddon` URL remains
      healthy; the project editor remains **SUBMITTED 5/5**.
- [ ] An ordinary-user run, multi-account Redis verification, and native Reddit
      mobile verification remain recommended evidence rather than submission
      blockers.

## Required submission bundle

| Requirement                                            | Evidence                                                                                   | Done |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---- |
| Joined hackathon from eligible Devpost account         | Submitted Devpost entry and participant/dashboard view                                     | [x]  |
| Game built with Reddit Developer Platform / Devvit Web | Uploaded app runs in Reddit post                                                           | [x]  |
| All required Devpost fields completed in English       | Submitted public entry and final preview                                                   | [x]  |
| Feature/functionality text description                 | Copy verified against uploaded build                                                       | [x]  |
| Unique Devvit app listing                              | `https://developers.reddit.com/apps/ramageddon-game`                                       | [x]  |
| Demo subreddit                                         | `https://www.reddit.com/r/ramageddon_game_dev`                                             | [x]  |
| Accessible post running the actual game                | `https://www.reddit.com/r/ramageddon_game_dev/comments/1uwzwl3/wreckcade_daily_wreckpile/` | [x]  |
| Detailed root `README.md` describing game and play     | This repository's `README.md`                                                              | [x]  |
| App remains free and unrestricted through judging      | Signed-out WRECKCADE exact-link launch and modal verification                              | [x]  |
| Rights cleared for every submitted component           | [`docs/ASSET_LEDGER.md`](ASSET_LEDGER.md) plus entrant attestation                         | [ ]  |
| Optional public video under one minute                 | `[DEMO_VIDEO_URL]`                                                                         | [ ]  |
| Optional public source repository                      | Public current tree: `https://github.com/BoneShaman/WRECKCADE`                             | [x]  |
| Public privacy policy                                  | `https://github.com/BoneShaman/WRECKCADE/blob/main/docs/PRIVACY.md`                        | [x]  |
| Public terms                                           | `https://github.com/BoneShaman/WRECKCADE/blob/main/docs/TERMS.md`                          | [x]  |
| Optional actionable Devvit feedback form               | Submitted-form confirmation                                                                | [ ]  |

The rules recommend a judging post in a **public subreddit with fewer than 200
members**. Reddit approved `r/ramageddon_game_dev` as Public on July 15, 2026.
The exact WRECKCADE post, splash, launch action, and generated-car Crew Garage
subsequently loaded in a visibly signed-out in-app browser through the live
0.0.8 webview.

## External account actions

These steps require the entrant's Reddit/Devpost identity and cannot be
completed by repository code alone.

### Devpost

- [x] Sign in to the entrant's Devpost account.
- [x] Click **Join Hackathon** on the
      [competition page](https://redditgameswithahook.devpost.com/).
- [ ] Confirm the entrant/team/organization is eligible.
- [ ] If entering as a team or organization, appoint one eligible representative
      authorized to submit for everyone.
- [x] Create, populate, and submit the project before the deadline.
- [x] Refresh the submitted project title, copy, links, and gallery for
      WRECKCADE, then confirm it remains in **SUBMITTED TO** state.
- [x] Paste only claims that pass `docs/SUBMISSION.md`'s claims gate.
- [x] Add the app listing, demo subreddit, running post, and repository links.
- [ ] Add the optional public video and repository links if they improve the
      entry and are safe to publish.
- [x] Preview the populated submission in English while it was still a draft;
      submit only after the entrant's final confirmation.
- [x] Submit; the entry is no longer a draft.
- [x] Capture the submission confirmation and final public/project URL:
      `https://devpost.com/software/ramageddon`.

### GitHub

- [x] Rename the public source repository to `BoneShaman/WRECKCADE`; verify
      `gh repo view` reports it as PUBLIC and origin fetch/push both use the new
      URL.
- [x] Push commit `f63fe85` (**Rebrand as WRECKCADE and forge the scrapyard**) to
      `origin/main`; verify the current source, privacy-policy, and terms URLs are
      public.

### Reddit and Devvit

- [x] Enroll the entrant's Reddit account at
      [developers.reddit.com](https://developers.reddit.com/).
- [x] Reddit approved the dedicated demo subreddit as Public. Devvit Admin
      Helper 0.0.6 remains installed as a secondary access safeguard.
- [x] Give the entrant account moderator permission needed to install/playtest.
- [x] Repository copy and in-game surfaces use the WRECKCADE name; the legacy
      technical slug is retained only for install/state continuity and no
      template placeholder remains.
- [x] Saved and visually verified the Devvit app profile with name **WRECKCADE:
      Wrecks Become Weapons**; description **A three-minute destruction-derby
      survivor where every wreck becomes a high-speed weapon.**; privacy URL
      `https://github.com/BoneShaman/WRECKCADE/blob/main/docs/PRIVACY.md`; and
      terms URL `https://github.com/BoneShaman/WRECKCADE/blob/main/docs/TERMS.md`.
      The General profile and both policy links reflected the saved values on
      July 15, 2026 AEST; the legacy technical slug remains unchanged.
- [x] Reddit rejected the taken `ramageddon` slug; `ramageddon-game` passed the
      live uniqueness check and remains the technical Devvit app name. The
      in-game player-facing title is **WRECKCADE**.
- [x] Authenticate the local CLI with `npm run login` (`u/BoneShaman`).
- [x] Install the uploaded app to the dedicated playtest subreddit.
- [ ] Test the generated post as developer, moderator, and ordinary user.
- [x] Upload and install the known-good build as Devvit version 0.0.8; confirm
      the active install with the CLI listing.
- [x] Copy the resulting `developers.reddit.com/apps/{app-name}` listing URL.
- [x] Create **WRECKCADE: Daily Wreckpile**, a clean demonstration post that
      launches 0.0.8.
- [x] Open the exact new post in a visibly signed-out browser, confirm the
      `0-0-8-webview`, activate **WRECK THE HORDE**, and reach the generated-car
      Crew Garage inside the Reddit modal.
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
- [ ] WRECKCADE was newly created or significantly updated after June 17, 2026.
- [ ] If it existed earlier, the Devpost description clearly identifies the
      significant changes made during the submission period.
- [ ] The project has not won a previous Reddit hackathon.
- [ ] It was not developed with Reddit/Devpost financial or preferential support
      that triggers the official-rules exclusion.
- [ ] The entrant owns or has sufficient license to every line of submitted code,
      image, texture, font, sound, track, video clip, logo, and written passage.
- [x] Resolve player-facing title clearance: the exact **RAMAGEDDON** collision
      on Nintendo was removed by rebranding to **WRECKCADE**. Exact-name sweeps
      found no WRECKCADE game/store, indexed web/social, GitHub repository/code,
      IP Australia, or USPTO match; `.com` and `.com.au` also had no DNS/registry
      footprint during the July 15 audit. This is a documented preliminary
      clearance search, not a substitute for professional similarity clearance
      before a larger commercial launch.
- [x] `package.json` and the root `LICENSE` both declare BSD-3-Clause.
- [ ] Contracted or AI-assisted work remains directed by the entrant and can be
      represented as the entrant's original project under the relevant licenses.
- [ ] A team/organization representative can verify each member's role if asked.
- [ ] Entrant understands one project can win only one competition prize.

## Product and judging gate

### Stage 1: viability and required platform

- [x] The game launches and finishes a complete run in a Reddit Interactive Post;
      the initial live build completed a synced run and 0.0.2 was separately
      verified through its first upgrade. Devvit CLI confirms 0.0.8 as the active
      install, and signed-out exact-post readback reaches its Crew Garage.
- [x] The client is Devvit Web, not a teaser that links to an external full game.
- [x] Devvit is materially used for authenticated identity and shared Redis state.
- [x] The menu/results surface daily community mechanics without the README.
- [x] The experience has an original hybrid presentation and a distinct
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
- [x] Empty, loading, offline, API-error, and duplicate-submission states have
      understandable messages and recovery paths.

### Polish

- [x] No template counter, generic menu, sample form, Snoo, or placeholder copy
      is referenced by the active application screens.
- [x] No debug panel, fake score, private URL, broken image, overflowing text,
      or uncaught error appears in the verified live and exact-viewport paths.
- [x] The prior uploaded 0.0.5 version completed a mobile-sized run/result and
      synced its Wreckpile and Blueprint Vote flow. Live 0.0.8 Reddit shell and
      modal captures now occupy `docs/media/09-live-reddit-result.png` and
      `docs/media/10-live-reddit-feed.png`; the final 11-image WRECKCADE gallery
      and captions are installed and verified on the public Devpost page.
- [x] Gameplay remained stable through a controlled x21 wreck combo/cascade
      with 18 hot wrecks active simultaneously.
- [x] A run can be retried repeatedly without duplicate listeners, stale state,
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
- [x] Hit-stop, camera trauma, particles, procedural animation, and hybrid
      synthesized/original sample audio reinforce impact while preserving
      steering authority.
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
- [x] The production `dist/client` contains only the WRECKCADE entrypoints,
      styles, scripts, source maps, WAV/WebP production assets, and module preload
      helper; unused starter PNGs are not copied into the Devvit bundle.
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
- [x] Desktop and exact mobile-sized browser runs remain playable during the
      intended full-run density; a prior natural 180-second audit held
      approximately 54 fps even under 4× CPU throttling, and the final narrow
      cascade proof kept a 36-car aligned chain visible at 333×515.
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
- [x] Active production rendering combines original Phaser work with six
      entrant-directed, provenance-documented WebPs: four environment assets,
      a nine-vehicle/four-damage-state atlas, and a barrel/blast/repair atlas.
      Production audio is an original hybrid of WebAudio synthesis and
      entrant-directed, locally generated Stable Audio 3 SFX with documented
      provenance; the production bundle contains no stock-library or unlicensed
      third-party game assets.
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
      audio; `M` toggles all game sound.
- [x] Text remains legible without overlapping in the exact 613×512 feed and
      333×515 expanded browser layouts.
- [x] The launch button has labeled semantics plus visible hover, active, and
      `focus-visible` treatment; canvas choices also include number labels.
- [x] Camera trauma and hit-stop are bounded; no rapid full-screen flash system is
      used.
- [x] `P` pause stops simulation danger and engine audio.

Exact-viewport browser QA is evidence for layout and input behavior, not a claim
that the game has completed native Reddit mobile or ordinary-user access
verification. Those rows remain open above.

## Final hour

- [x] Freeze feature work; change only submission blockers.
- [x] Upload one final known-good build.
- [x] Record the installed build: Devvit 0.0.8, confirmed active by the CLI
      install listing on July 15, 2026 AEST.
- [ ] Complete one ordinary-user desktop run from the exact demo link.
- [x] Complete one mobile-sized run from the exact demo link: live 0.0.5 ended
      at 1,778 score, 12 wrecks, x7 best combo, and 24 scrap with synced results.
      Native-device touch steering remains a separate recommended check.
- [ ] Complete and sync a live mobile-sized 0.0.8 run from the WRECKCADE post.
- [ ] Confirm leaderboard, crew, Wreckpile, and vote updates from two accounts.
- [x] Open the new WRECKCADE post without relying on a Reddit login and verify its
      0.0.8 splash, launch action, and Crew Garage inside the Reddit modal.
- [x] Complete the final public-surface audit: the exact WRECKCADE post passed
      signed-out 0.0.8 verification, the refreshed Devpost page passed its
      signed-out visual check, and the current Devvit profile displays the exact
      final metadata and policy links.
- [x] No optional video is attached, so the one-minute video gate is not
      applicable to the submitted entry.
- [x] The earlier submitted description was read against the visible 0.0.5 build.
- [x] Re-read the refreshed WRECKCADE description against the live 0.0.8 post.
- [x] Submit the Devpost entry and save confirmation evidence.
- [ ] Do not remove access or introduce incompatible updates during judging.

## Authoritative references

- [Competition overview](https://redditgameswithahook.devpost.com/)
- [Official rules](https://redditgameswithahook.devpost.com/rules)
- [Competition schedule](https://redditgameswithahook.devpost.com/details/dates)
- [Devvit Web overview and runtime limits](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview)
- [Devvit Rules](https://developers.reddit.com/docs/devvit_rules)
- [Launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide)
- [Building Community Games](https://developers.reddit.com/docs/guides/best-practices/community_games)
