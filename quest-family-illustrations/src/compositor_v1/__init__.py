"""
Quest Family Compositor v1 (ARCHIVED/PAUSED)

This module contains the original automated compositor that composites
sprite sheets onto background images. It has been archived while we test
a new pipeline approach based on manual testing learnings:

NEW PIPELINE APPROACH:
1. Phase 1 (Scene Design): Generate complete scenes with Flux Schnell
   - Characters baked into the scene
   - Extract positions/poses as "storyboard"

2. Phase 2 (Asset Generation): 
   - Sprites: Gemini API (not PuLID) for better pose control
   - Backgrounds: Flux Schnell without characters

3. Phase 3 (Composite):
   - For now: Manual in Canva
   - Later: Rebuild automated compositor with new learnings

LEARNINGS FROM V1:
- Feathered alpha masking helps with white halos
- Background-sampled shadows look more natural
- Ground alignment (feet anchoring) prevents floating
- These techniques can be applied to v2 compositor

To run the v1 compositor (for reference/testing):
    python -m src.compositor_v1.compositor --help
"""

from .compositor import composite, composite_to_file

__all__ = ["composite", "composite_to_file"]
