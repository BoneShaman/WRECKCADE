# WRECKCADE visual provenance

WRECKCADE's physics, hitboxes, weapons, semantic feedback, HUD, controls, and
live text are rendered from original Phaser/HTML/CSS code. Its environment,
vehicle bodies, staged vehicle damage, explosive props, blast animation, and
repair cases use six bitmap runtime assets generated specifically for this
competition build with OpenAI's built-in image generation tool on July 15, 2026. No reference or input images were supplied, and the prompts excluded
people, third-party characters, logos, readable text, and external brands.

## Shipped assets

| Runtime asset                                | Purpose                                                                    | Final dimensions |    Size |
| -------------------------------------------- | -------------------------------------------------------------------------- | ---------------: | ------: |
| `assets/visuals/arena-floor-v1.webp`         | Camera-tracked patched asphalt/concrete arena floor                        |        1024×1024 | ~348 KB |
| `assets/visuals/garage-backdrop-v1.webp`     | Responsive three-bay crew-garage backdrop                                  |        1536×1024 | ~349 KB |
| `assets/visuals/scrapyard-landmarks-v1.webp` | 2×2 alpha atlas: wreck pile, tyre wall, crusher, stand/floodlights         |        1024×1024 | ~290 KB |
| `assets/visuals/arena-decals-v1.webp`        | 2×2 alpha atlas of flat drive-over target, drain, crater, and launch plate |        1024×1024 | ~377 KB |
| `assets/visuals/vehicle-atlas-v1.webp`       | 9 vehicle models × healthy, battered, critical, and wrecked states         |         512×1152 | ~167 KB |
| `assets/visuals/hazards-fx-v1.webp`          | 4×4 alpha atlas: barrels, eight-frame blast, and repair cases              |          512×512 | ~125 KB |

## Prompt records

### Arena floor

> Square, edge-to-edge, straight-down orthographic scrapyard asphalt and concrete
> for a top-down destruction-derby survivor: patched tarmac, cracked slabs,
> faded warning-yellow arcs, rust-orange plates, oil ghosts, skid loops, chalk
> impact rings, bolts, grit and small weeds. Polished 1990s demolition-comic /
> screen-printed punk texture in asphalt navy, yellow, rust, cyan, magenta and
> bone white. Gameplay-readable; no vehicles, people, buildings, words, logos,
> UI, border, watermark, or perspective.

### Crew garage

> A responsive nighttime demolition garage with three welded bays: yellow work
> lights on the left, cyan tubes in the center, and rust-orange furnace light on
> the right. Tyres, chains, tools, patched corrugated steel, roller door,
> floodlight haze, cables, welding glow, bolts and abstract paint marks. A
> polished screen-printed 1990s demolition-comic environment; dark title band
> and quiet control band; no people, cars, readable text, logos, UI, or title.

### Scrapyard landmarks

> Strict 2×2 top-down atlas on uniform `#00ff00`: crushed demolition-car mountain;
> curved tyre wall with concrete barriers; hydraulic car crusher with chains and
> scrap cubes; ramshackle spectator stand with floodlights, blank flags and
> barrels. Chunky comic silhouettes in rust/yellow/cyan/navy/bone; no people,
> text, logos, shadows, smoke, glow, or background variation.

### Drive-over decals

> Strict 2×2 top-down atlas on uniform `#00ff00`: cracked yellow/bone impact
> target; orange industrial drain with welded repair plates; dark tyre-burn
> crater with magenta paint; cyan/yellow riveted launch plate. Every feature is
> visually flat enough to drive over, with no raised objects, shadows,
> perspective, vehicles, people, text, logos, UI, or watermark.

### Crew vehicles and staged damage

> Strict 3×4 straight-down atlas on uniform `#00ff00`; three columns are the
> yellow/black Iron Howlers demolition muscle car, cyan/navy/magenta Neon
> Jackals wedge coupe, and rust-orange/oxblood Rust Reapers hot-rod pickup.
> Four rows retain each car's axle, body anchor, scale, and view while moving
> from competition-used to battered, critical, and fully wrecked. Every car
> points right. Premium hand-painted 2D demolition-comic sprites with chunky
> navy ink, mechanical detail, no shadows, scenery, text, logos, people, brands,
> UI, or watermark.

### Hostile vehicle roster and staged damage

> Strict 6×4 straight-down atlas on uniform `#00ff00`; two compact swarm
> buggies, an orange striker dragster, oxblood bruiser van, magenta elite tow
> crusher, and charcoal/purple six-wheel Road King. Four damage rows preserve
> each model's center and footprint from healthy through battered, critical,
> and wrecked. Bold flat color, metal grit, premium screen-printed
> demolition-comic style, mobile readability, no scenery, text, logos, people,
> brands, UI, or watermark.

### Barrels, blast sequence, and repair cases

> Strict 4×4 atlas on uniform `#00ff00`: four tangible fuel/chemical props;
> eight centered frames progressing from ignition snap through cream/orange/
> magenta fireball into smoke and embers; and four mint/cyan/lime repair cases.
> Straight-down game view, chunky navy outlines, no road, vehicles, people,
> words, brands, UI, borders, or watermark.

## Processing and QA

- Chroma sources were converted to alpha with the installed OpenAI imagegen
  `remove_chroma_key.py` helper using border sampling, soft matte, and despill.
- The two generated car grids were component-checked, normalized around stable
  centers, resized with a constant scale per vehicle, transposed into a single
  nine-row runtime atlas, and given eight-pixel or greater frame padding. This
  prevents damage-stage jumps and filtering bleed without changing simulation
  hitboxes.
- The environment outputs were resized with Lanczos resampling and encoded as
  WebP at quality 84–92. The six final runtime files total about 1.62 MB.
- Final files were checked for dimensions, alpha, nonempty frames, and frame
  padding, visually inspected at original resolution, built through Vite, and
  reviewed in desktop, 613×512, 390×844, and 333×515 gameplay/menu captures.
- Generated art is non-semantic. Live text, buttons, hit targets, selected
  states, collision boundaries, damage calculations, weapon attachments, and
  combat feedback remain code-controlled for accessibility and truthful
  interaction.

These assets are entrant-directed project outputs rather than stock-library
material. The repository does not claim rights over any external reference
material excluded elsewhere in `docs/ASSET_LEDGER.md`.
