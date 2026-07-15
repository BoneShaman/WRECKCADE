# WRECKCADE audio provenance

WRECKCADE's shipped sample layers were generated locally with the
user-provided Stable Audio 3 SFX MLX runner and then edited specifically for
the game. No stock recordings or third-party sound-library files are included.
The runtime combines these samples with responsive WebAudio synthesis.

## Generator settings

- Runner: `optimized/mlx/sa3`
- DiT: `sm-sfx`
- Decoder: `same-s`
- Steps: `8`
- Sigma max: `1.0`
- CFG: default `1.0` (no CFG argument passed)
- Negative prompting: none; exclusions were written into the normal prompt
- Source format: 44.1 kHz stereo
- Shipped format: 32 kHz mono PCM16 WAV

## Source prompts

### Vehicle impacts

Seeds `2501`, `2502`, and `2505`; 1.0 second each:

> medium demolition derby car side impact, compact violent sheet-metal crunch
> and bumper slam, beautiful layered metallic deformation with a short glassy
> sparkle tail, punchy arcade game collision, dry isolated game sound effect,
> no music, no ambience, no voice, no bass boom, no explosion, no cannon

### Tyre drift

Seed `2903`; 2.0 seconds:

> loopable performance car drifting, sustained gritty rubber tire squeal
> sliding across dry asphalt, energetic but small arcade vehicle sound, steady
> continuous middle texture with no crash and no engine, dry isolated game
> sound effect, no music, no ambience, no voice, no bass boom, no explosion,
> no cannon

Seed `2917`; 2.0 seconds:

> loopable demolition derby handbrake drift, continuous high rubber squeal
> with granular asphalt scrub and tire chatter, juicy compact arcade skid,
> steady middle with no start impact and no end impact, dry isolated game sound
> effect, no engine, no crash, no music, no ambience, no voice, no bass boom,
> no explosion

### Engine

Seeds `3301`, `3307`, `3313`, `3319`, `3323`, and `3329`; 1.0 second each:

> battered compact car motor revving upward, dry mechanical exhaust rasp and
> fast engine acceleration, small controlled arcade vehicle scale, isolated
> game sound effect, no crash, no skid, no music, no ambience, no voice, no
> explosion, no bass boom

## Shipped assets

| Asset                  | Source                                                            | Processing                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `impact_light.wav`     | Impact seed `2502`                                                | Trimmed to 0.42 s; 180 Hz high-pass; 12 kHz low-pass; 150 ms tail fade; gain reduction; peak limiter; mono/resample                                                                                                                                  |
| `impact_medium.wav`    | Impact seed `2501`                                                | Trimmed to 0.58 s; 65 Hz high-pass; 14.5 kHz low-pass; bass/treble shaping; 180 ms tail fade; peak limiter; mono/resample                                                                                                                            |
| `impact_heavy.wav`     | Impact seed `2505`                                                | Slowed/pitched about 12%; trimmed to 0.72 s; 42 Hz high-pass; 13.5 kHz low-pass; low-body shaping; 2:1 compression; 220 ms tail fade; peak limiter; mono/resample                                                                                    |
| `drift_loop.wav`       | Drift seeds `2903` and `2917` plus deterministic procedural noise | Source regions 0.22-1.02 s and 0.16-1.00 s; 500 Hz high-pass; 14 kHz low-pass; 3.2 s circular Hann overlap-add texture from 105-170 ms grains at 0.82-1.20× speed, with deterministic band-shaped noise; RMS-matched and seam-rotated; mono/resample |
| `engine_grit_loop.wav` | Engine seeds `3301`, `3307`, `3313`, `3319`, `3323`, and `3329`   | Source region 0.15-0.59 s from each generation; 55 Hz high-pass; 9.5 kHz low-pass; 2.4 s circular Hann overlap-add texture from 105-155 ms grains at 0.88-1.13× speed; RMS-matched and seam-rotated; mono/resample                                   |
| `engine_rev.wav`       | Engine seed `3307`                                                | Source region 0.08-0.72 s; 55 Hz high-pass; 11 kHz low-pass; 10 ms attack; 160 ms tail fade; peak limiter; mono/resample                                                                                                                             |
| `wreck_chain.wav`      | The three shipped impact layers                                   | Light at 0 ms, medium at 150 ms, heavy at 350 ms; escalating mix; 2.5:1 compression; peak limiter; 200 ms tail fade                                                                                                                                  |

Severely clipped experimental generations were rejected and are not part of
the repository or production bundle.

## Circular-loop construction and QA

The engine bed uses deterministic random seed `7331`, 29 ms grain centers,
12-window median-RMS source selection, per-grain RMS `0.070`, and final RMS
`0.075`. The drift bed uses seed `7919`, 12 ms grain centers, per-grain RMS
`0.045`, and final RMS `0.046`. Its procedural floor uses seed `7927` and a
620 Hz high-pass, 13.75 kHz low-pass, and broad 3.6 kHz focus curve. Both loops
wrap grains directly around a circular buffer; they are not single tail/head
crossfades. The export seam is rotated to a low adjacent-sample delta with less
than 0.12 dB of 20 ms pre/post RMS mismatch.

Final PCM16 QA measured the engine loop at -10.834 dBFS peak and -22.499 dBFS
RMS, with a 0.078 dB 20 ms seam-envelope step. The drift loop measured
-11.473 dBFS peak and -26.745 dBFS RMS, with a 0.091 dB seam-envelope step.
Neither loop's conditional peak-control stage engaged, and neither contains a
clipped PCM sample.
