# Content QA Tracking

This document tracks content issues discovered during testing that require updates to story data, prompts, or asset generation in the next content pass.

---

## Dragon Knight Rescue

### Issue 1: Scene 2 Bridge Missing Rope
- **Status:** Open
- **Scene:** Scene 2 (rope-bridge.png)
- **Problem:** The action prompt says to "hold the rope" but the bridge image doesn't show visible ropes to hold onto
- **Fix for next generation:** Update Scene 2 prompt to include "rope bridge with visible rope handrails to hold onto"
- **Current prompt (from image_generation_learnings.md):**
  ```
  Three young knights each separately crossing a rickety wooden rope bridge...
  ```
- **Suggested prompt update:**
  ```
  Three young knights each separately crossing a rickety wooden rope bridge with thick rope handrails on both sides...
  ```

### Issue 4: Scene 3 Troll Missing from Image
- **Status:** Open
- **Scene:** Scene 3 (grumpy-troll.png / crystal cave)
- **Problem:** The DM narration mentions "A grumpy Mountain Troll sits on the only path!" but the troll is not visible in the scene image
- **Fix for next generation:** Update Scene 3 prompt to include the troll character
- **Current narration:**
  ```
  A grumpy Mountain Troll sits on the only path! 'NO PASS! Me napping!' But Ember's squeaks are just beyond!
  ```
- **Suggested prompt update:**
  ```
  Three young knights each separately standing in a dark cave passage, a large grumpy mountain troll blocking the path ahead, the troll is sitting and looking sleepy, glowing crystals on walls...
  ```
- **Alternative:** Update the narration to not mention a troll, or change the scene concept

### Issue 5: Reward Images Missing
- **Status:** Open (tracked, fallback added)
- **Problem:** All reward images return 404 - the `/public/images/rewards/` directory doesn't exist
- **Rewards needed for Dragon Knight Rescue:**
  - `/images/rewards/phoenix-feather.png` (Scene 3 outcome)
  - `/images/rewards/ember-scale.png` (Scene 5 outcome)
  - `/images/rewards/dragon-knight-badge.png` (Legendary ending)
  - `/images/rewards/golden-sword.png` (Legendary ending)
  - `/images/rewards/swift-boots.png` (Legendary ending)
  - `/images/rewards/kind-cape.png` (Legendary ending)
  - `/images/rewards/brave-badge.png` (Great ending)
  - `/images/rewards/dragon-medal.png` (Great ending)
  - `/images/rewards/rescue-badge.png` (Good ending)
- **Rewards needed for Candy Volcano:**
  - `/images/rewards/golden-lollipop.png`
  - `/images/rewards/dragon-scale.png`
  - `/images/rewards/legendary-badge.png`
  - `/images/rewards/wand-sprinkles.png`
  - `/images/rewards/frosty-medal.png`
  - `/images/rewards/bloom-crown.png`
  - `/images/rewards/great-badge.png`
  - `/images/rewards/candy-medal.png`
  - `/images/rewards/savers-badge.png`
- **Temporary fix:** PlaceholderImage fallback added to RewardCelebration component (colored boxes with text)
- **Permanent fix:** Generate reward images as part of human-in-the-loop pipeline
- **Style guidance:** Match the Pixar-adjacent storybook style of scene images; small icons/badges work well

---

## Content Generation Checklist

When generating content for a new adventure:

1. [ ] **Scene prompts match narration** — If narration mentions an NPC, the scene prompt must include them
2. [ ] **Action prompts match visuals** — If an action mentions interacting with something, it should be visible in the scene
3. [ ] **Reward images generated** — Generate all reward images referenced in the adventure JSON
4. [ ] **Preview image created** — Generate or select a preview image for adventure selection

---

## Related Documents

- [image_generation_learnings.md](image_generation_learnings.md) — Prompt engineering guide
- [ADVENTURE_GENERATION_PROMPT.md](ADVENTURE_GENERATION_PROMPT.md) — Adventure creation prompt

---

*Last updated: January 27, 2026*
