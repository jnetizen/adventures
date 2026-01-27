# Quest Family Illustration Pipeline

Automated illustration pipeline for the Quest Family children's storytelling app. Generates personalized character sprites (Flux + PuLID), scene backgrounds (Flux Schnell), and composites them into final scene images.

## Phase 1: Compositor

The compositor takes one or more sprite sheets (each 1536×768, 5 poses), a background image, and character placement configs, then outputs a composited scene PNG.

### Setup

```bash
python -m venv .venv
source .venv/bin/activate   # or: .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Usage

#### Option 1: Config File (Recommended for Multi-Character Scenes)

Create a JSON config file with your scene setup. Use `base_scale` for consistent character sizes; optional `scale_override` per character for depth (e.g. 0.9 = smaller, 1.1 = larger).

```json
{
  "background": "assets/backgrounds/scene1_stormy_peaks.png",
  "base_scale": 0.30,
  "characters": [
    {
      "sprite_sheet": "assets/sprites/shield-knight.png",
      "pose_index": 0,
      "x": 0.50,
      "y": 0.82
    },
    {
      "sprite_sheet": "assets/sprites/swift-knight.png",
      "pose_index": 2,
      "x": 0.25,
      "y": 0.80,
      "scale_override": 0.93
    },
    {
      "sprite_sheet": "assets/sprites/kind-knight.png",
      "pose_index": 0,
      "x": 0.75,
      "y": 0.80
    }
  ]
}
```

Then run:

```bash
python -m src.compositor \
    --config config/scenes/scene_1.json \
    --output output/scene_1_final.png
```

#### Option 2: CLI Arguments

For quick single-character tests or scripting:

```bash
python -m src.compositor \
    --background assets/test_background.png \
    --characters '[{"sprite_sheet": "assets/test_sprite_sheet.png", "pose_index": 3, "x": 0.5, "y": 0.75, "scale": 0.35}]' \
    --output output/test_scene.png
```

### Character Placement Config

**Scene-level (optional):**

| Field | Type | Description |
|-------|------|-------------|
| `base_scale` | float (0-1) | Shared scale for all characters. When set, per-character `scale` is optional. |

**Per character:**

| Field | Type | Description |
|-------|------|-------------|
| `sprite_sheet` | string | Path to the character's sprite sheet PNG (e.g. `assets/sprites/...`). 1536×768, 5 poses. |
| `pose_index` | int (0-4) | Which pose to use from the sprite sheet |
| `x` | float (0-1) | Horizontal position (0=left, 1=right) |
| `y` | float (0-1) | Vertical position (0=top, 1=bottom). Anchor is **feet** (bottom of visible sprite). |
| `scale` | float (0-1) | Character height as fraction of background height. Required only when `base_scale` is not set. |
| `scale_override` | float (0-2] | When `base_scale` is set, multiplies it for this character (e.g. 0.9 = further away, 1.1 = closer). |

### Pose Index Reference

| Index | Pose | When to Use |
|-------|------|-------------|
| 0 | Standing/Ready | Default, introductions, neutral moments |
| 1 | Running/Action | Chase scenes, urgency, movement |
| 2 | Pointing | Discovery, directing attention |
| 3 | Cheering | Victory, celebration |
| 4 | Kneeling/Special | Helping, protecting, dramatic moments |

### Compositor Behavior

- **Background removal:** Feathered alpha masking (transition band) removes white halos; slight alpha blur for anti-aliased edges.
- **Shadows:** Soft drop shadows with color sampled from the background’s dark tones; fixed opacity (~35%).
- **Ground alignment:** Characters are anchored by the **lowest opaque row** (feet) so they sit on surfaces rather than float.

### Story Templates

Full adventure templates are stored in `config/stories/`. Each template contains:

- Character definitions with sprite generation prompts
- Scene backgrounds prompts
- Character placements for each scene

See `config/stories/dragon-knight-rescue.json` for an example.

### Tests

```bash
pip install pytest
pytest tests/ -v
```

## Project Structure

```
quest-family-illustrations/
├── src/
│   └── compositor.py        # Main compositing logic
├── config/
│   ├── stories/             # Adventure templates (JSON)
│   │   └── dragon-knight-rescue.json
│   └── scenes/              # Per-scene compositor configs (background + characters)
├── assets/
│   ├── backgrounds/         # Scene background images
│   └── sprites/             # Character sprite sheets
├── output/                  # Generated images (gitignored)
├── tests/
│   └── test_compositor.py   # Pytest suite
├── requirements.txt
└── README.md
```

## Pipeline Phases (Roadmap)

1. **Compositor** ✅ - Composite sprites onto backgrounds
2. **Sprite Generator** - Generate personalized character sprites via Replicate API
3. **Scene Builder** - Orchestrate full scene generation from story templates
4. **Background Generator** - Generate scene backgrounds via Replicate API
