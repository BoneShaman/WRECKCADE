# WRECKCADE Asset and License Ledger

This ledger records the production components intended for the WRECKCADE 1.0.0
competition build. It distinguishes shipped work from local reference material.
Any later music, font file, artwork, footage, logo, or other submitted component
must be added here with its creator, source, and license before release.

## Original production work

| Component                                                                                           | Source in this project                                                    | Creator / owner                                               | Rights status                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phaser gameplay rendering, hitboxes, attachments, particles, HUD, controls, and live UI text        | `src/client/scenes/`                                                      | WRECKCADE contributors                                        | Original code-native artwork and simulation; BSD-3-Clause project license                                                                                                                            |
| Interactive-post launch art, logo treatment, hero car, skid marks, pit board, and responsive layout | `src/client/splash.html`, `src/client/splash.css`, `src/client/splash.ts` | WRECKCADE contributors                                        | Original HTML/CSS/TypeScript artwork; BSD-3-Clause project license                                                                                                                                   |
| Arena, garage, landmarks, decals, vehicle/damage roster, barrels, blasts, and repair cases          | `assets/visuals/*.webp`                                                   | WRECKCADE contributors using OpenAI built-in image generation | Entrant-directed original prompts with no input/reference images; generated for this project, chroma-keyed where alpha was needed, resized/compressed, and documented in `docs/VISUAL_PROVENANCE.md` |
| Engine, drift, collision, weapon, pickup, upgrade, and result audio                                 | `src/client/systems/AudioDirector.ts`, `assets/audio/`                    | WRECKCADE contributors using local Stable Audio 3 SFX         | Original hybrid of runtime WebAudio and entrant-directed generated samples edited for this game; no stock or third-party sound-library audio; see `docs/AUDIO_PROVENANCE.md`                         |
| Game simulation, server APIs, Redis persistence, daily challenge systems, and shared types          | `src/client/`, `src/server/`, `src/shared/`                               | WRECKCADE contributors                                        | Original code; BSD-3-Clause project license                                                                                                                                                          |
| Reddit app icon                                                                                     | `assets/app-icon.png`                                                     | WRECKCADE contributors with OpenAI built-in image generation  | Entrant-directed original prompt with no input/reference images; generated for this project, then resized and palette-compressed to Devvit's 1024px/500 KB requirement                               |
| Competition screenshots                                                                             | `docs/media/`                                                             | WRECKCADE contributors                                        | Captures of the original hybrid Phaser/generated-environment runtime; final selection remains subject to the submission claims and QA gates                                                          |

WRECKCADE ships only the six documented, entrant-directed WebP runtime assets
and the separately listed Reddit icon; it does not ship stock textures,
third-party game art, music, stock recordings, or third-party sound-library
files. Vehicle bodies, staged damage, barrels, blast frames, and repair cases
use the generated atlases; collision silhouettes, attachments, particles,
damage rules, HUD, controls, and semantic UI text remain live
Phaser/HTML/CSS output. Active sound combines responsive browser synthesis with
the original locally generated and post-processed layers documented in
`docs/AUDIO_PROVENANCE.md`.

The UI uses system font stacks such as `Impact`, `Haettenschweiler`,
`Arial Narrow Bold`, `Menlo`, `ui-monospace`, and generic sans-serif/monospace
fallbacks. No font binary is bundled or redistributed by the project.

## Scaffold and direct dependencies

The repository began from Reddit's Devvit Phaser starter. The starter's 2025
Reddit Inc. BSD 3-Clause notice is retained in the root `LICENSE`; original
WRECKCADE contributions carry the additional 2026 WRECKCADE contributors
copyright line.

Direct dependency license values below are taken from the installed package
manifests corresponding to `package-lock.json`. Each dependency and its
transitive dependencies remain governed by their own licenses and notices.

| Package             | Locked version | License      |
| ------------------- | -------------: | ------------ |
| `@devvit/start`     |         0.13.7 | BSD-3-Clause |
| `@devvit/web`       |         0.13.7 | BSD-3-Clause |
| `devvit`            |         0.13.7 | BSD-3-Clause |
| `@hono/node-server` |          2.0.8 | MIT          |
| `hono`              |        4.12.28 | MIT          |
| `phaser`            |          4.2.0 | MIT          |
| `vite`              |          8.1.3 | MIT          |
| `typescript`        |          6.0.3 | Apache-2.0   |
| `eslint`            |         10.6.0 | MIT          |
| `prettier`          |          3.9.4 | MIT          |

## Explicitly excluded material

The following workspace material is not part of the active runtime, Devvit
source upload, public competition media, or claimed original work:

- `Vampire Survivors by poncle_files/` is local research/reference material.
  WRECKCADE claims no ownership or redistribution right. It is ignored by the
  repository, omitted from Devvit review-source packaging through
  `sourceIgnores`, absent from `dist/`, and must not be published or submitted.
- `public/snoo.png`, `public/assets/logo.png`, and `public/assets/bg.png` are
  unused Devvit starter remnants. Vite's `publicDir: false` prevents them from
  entering `dist/client`; `.gitignore` and Devvit `sourceIgnores` exclude
  `public/` from repository/review-source packaging. They are not WRECKCADE
  assets and must not be submitted.
- Third-party game captures, external logos, Reddit/Snoo artwork, and any future
  unlicensed reference material are not approved submission assets.

If a public source repository is created, exclude the local reference directory
and unused starter remnants before publishing it. A Devpost video must use only
WRECKCADE footage and entrant-created narration/captions unless every added
music, image, sound, or clip is separately documented here with sufficient
rights.

## Release verification

Before upload, confirm that excluded material is absent from the production
bundle:

```sh
rg -n 'Vampire Survivors|poncle|snoo\.png|assets/bg\.png|assets/logo\.png' \
  src dist/client
find dist/client -maxdepth 2 -type f -print
```

The first search should return no matches. The file listing should contain only
the WRECKCADE HTML, CSS, JavaScript, source-map, WAV, WebP, and preload outputs
expected by the Devvit build.
