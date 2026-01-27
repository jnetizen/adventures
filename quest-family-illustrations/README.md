# Quest Family Illustration Pipeline

Illustration pipeline for the Quest Family children's storytelling app. Generates scene images with personalized characters for family adventures.

> **Pipeline Status:** In transition. Testing a new approach based on manual testing learnings.

## Pipeline Approach (v2) — Current

Based on manual testing, we've pivoted to a new pipeline approach:

### Phase 1: Scene Design (per story)

1. Generate complete scenes with **Flux Schnell** (all characters + background baked in)
2. Extract from each scene: character positions, poses needed
3. This becomes our "storyboard"

### Phase 2: Asset Generation (per family)

1. **Sprites:** Generate with **Gemini API** (not PuLID) using:
   - Child's photo for face reference
   - Specific poses extracted from Phase 1
   - 3D Pixar-adjacent style prompting
   - Gemini provides much better pose control than PuLID

2. **Backgrounds:** Generate with Flux Schnell (without characters)

### Phase 3: Composite

- **For now:** Manual compositing in Canva (produces clean results)
- **Later:** Rebuild automated compositor with learnings from v1

### Why This Approach?

- **Complete scene generation works well** — Flux Schnell produces coherent scenes with all characters
- **Gemini beats PuLID for sprites** — Better pose control, actually follows pose prompts
- **Manual Canva compositing looks clean** — No halos, proper grounding, good blending

## Asset Storage

Pre-baked scene images (characters already in scene) are stored per-story:

```
assets/stories/
└── dragon-knight-rescue/
    └── scenes/
        ├── scene1_stormy_peaks.png
        ├── scene2_rope_bridge.png
        ├── scene3_crystal_cave.png
        ├── scene4_finding_ember.png
        └── scene5_rainbow_reunion.png
```

## Project Structure

```
quest-family-illustrations/
├── src/
│   ├── __init__.py
│   └── compositor_v1/       # Archived compositor (paused)
│       ├── __init__.py
│       └── compositor.py
├── config/
│   ├── stories/             # Adventure templates (JSON)
│   │   └── dragon-knight-rescue.json
│   └── scenes/              # Placement configs (v1 reference)
├── assets/
│   ├── stories/             # Pre-baked scene images (v2)
│   │   └── dragon-knight-rescue/
│   │       └── scenes/
│   ├── backgrounds/         # Raw backgrounds (v1)
│   └── sprites/             # Sprite sheets (v1)
├── output/                  # Generated images (gitignored)
├── tests/
│   └── test_compositor_v1.py
├── scripts/
│   └── composite_all_scenes_v1.py
├── requirements.txt
└── README.md
```

---

## Compositor v1 (Archived)

The original automated compositor is archived in `src/compositor_v1/`. It composites sprite sheets onto background images with:

- Feathered alpha masking (removes white halos)
- Background-sampled drop shadows
- Ground alignment (feet anchoring)

This code is preserved for reference when rebuilding the automated compositor.

### Setup (v1)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Usage (v1)

```bash
python -m src.compositor_v1.compositor \
    --config config/scenes/scene_1.json \
    --output output/scene_1_final.png
```

### Tests (v1)

```bash
pytest tests/test_compositor_v1.py -v
```

### Learnings from v1

These techniques worked well and should be applied to v2:

1. **Feathered alpha masking** — Transition band (WHITE_LOW=220, WHITE_HIGH=245) with slight Gaussian blur on alpha channel
2. **Background-sampled shadows** — Sample dark tones (10th-25th percentile) from background region for shadow color
3. **Ground alignment** — Anchor sprites by lowest opaque row (feet), not center

---

## Key Documentation

- **[../docs/image_generation_learnings.md](../docs/image_generation_learnings.md)** — Critical reference for prompt engineering, model selection, and working prompts. Consult this when adding new stories or modifying the generation pipeline.

## Roadmap

- [x] Compositor v1 (archived)
- [ ] Gemini sprite generator integration
- [ ] Automated scene builder
- [ ] Compositor v2 (rebuilt with new approach)
