# Quest Family Illustration Pipeline

Assets and prompts for generating scene images for the Quest Family storytelling app.

## Current Approach

Based on manual testing, we generate **complete scenes** (characters baked in) using:

- **Flux Schnell** or **Gemini Pro** for scene generation
- **Gemini** for sprite sheets (better pose control than PuLID)
- **Manual compositing** in Canva when needed

For prompt engineering best practices, see [../docs/image_generation_learnings.md](../docs/image_generation_learnings.md).

## Asset Storage

Pre-baked scene images are stored per-story:

```
assets/stories/
├── dragon-knight-rescue/
│   └── scenes/
│       ├── scene1_stormy_peaks.png
│       ├── scene2_rope_bridge.png
│       └── ...
└── fire-gem-quest/
    ├── prompts/
    │   ├── scene_prompts.md
    │   └── reward_prompts.md
    └── scenes/
        ├── scene1_ashen_path.png
        └── ...
```

## Project Structure

```
quest-family-illustrations/
├── assets/
│   └── stories/          # Pre-baked scene images per adventure
├── config/
│   └── stories/          # Story templates and prompts (JSON)
├── _archive/             # Archived compositor v1 code
│   ├── compositor_v1/    # Original Python compositor
│   ├── backgrounds/      # Raw backgrounds (for reference)
│   ├── sprites/          # Sprite sheets (for reference)
│   └── config_scenes/    # Placement configs
├── output/               # Generated images (gitignored)
└── README.md
```

## Archived Compositor (v1)

The original automated compositor is in `_archive/compositor_v1/`. It was replaced by pre-baked scenes which produce cleaner results.

Key techniques from v1 (for future reference):
- Feathered alpha masking (removes white halos)
- Background-sampled drop shadows
- Ground alignment (feet anchoring)

To run (for reference only):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd _archive && python -m compositor_v1.compositor --help
```

## Documentation

- [../docs/image_generation_learnings.md](../docs/image_generation_learnings.md) — Prompt engineering guide
- [../docs/CONTENT_QA.md](../docs/CONTENT_QA.md) — Missing assets and content issues
