# Image Generation Learnings & Prompts

## Overview

This document captures our learnings from manual testing of the Quest Family illustration pipeline. It includes what worked, what didn't, and the final prompts that produce good results.

---

## Key Discoveries

### 1. Complete Scene Generation > Sprite Compositing (For Now)

**What we tried:** Generate sprites separately, generate backgrounds separately, composite them together.

**What happened:** Compositor produced janky results — white halos around characters, floating characters, bad shadows, characters not grounded properly.

**What works better:** Generate complete scenes with characters baked in using Flux Schnell. Use these as the final images OR as "storyboards" to extract poses/positions for later sprite compositing.

---

### 2. Gemini > PuLID for Sprite Sheets

**What we tried:** Flux PuLID for sprite sheet generation with pose descriptions.

**What happened:** PuLID ignores pose instructions. We asked for "arms raised high, arms out for balance, looking up" and got 5 nearly identical standing poses.

**What works better:** Gemini with photo reference. It actually follows pose instructions and gives distinct poses.

| Aspect | PuLID | Gemini |
|--------|-------|--------|
| Pose control | ❌ Poor — ignores instructions | ✅ Excellent — follows instructions |
| 3D Pixar style | ✅ Good | ✅ Good (with prompting) |
| Face likeness | ✅ Direct injection | ⚠️ Interpreted from photo |
| Cost | ~$0.02/sheet | Free with Pro / ~$0.02-0.04 API |

---

### 3. "Separately" is the Magic Word for Character Spacing

**What we tried:** 
- "not overlapping, not touching" — characters still touched
- "spread apart with clear space" — characters still touched
- "standing far apart with big gaps" — characters still touched
- "NOT holding hands" — characters held hands

**What happened:** Flux interprets "celebrating together" as physical togetherness regardless of negative instructions.

**What works:** Add "each separately" early in the prompt:
- ❌ "Three young knights celebrating on a hilltop..."
- ✅ "Three young knights **each separately** celebrating on a hilltop..."

---

### 4. Aspect Ratio Matters for Character Spacing

**What we tried:** 1:1 aspect ratio for scenes with 3 characters.

**What happened:** Characters bunched together — not enough horizontal space.

**What works:** 16:9 aspect ratio gives characters room to spread out.

---

### 5. Numbered Pose Lists Don't Work in PuLID

**What we tried:**
```
5 poses:
1. Standing neutral
2. Arms out wide
3. Looking up
4. Arms raised high
5. Walking forward
```

**What happened:** PuLID generated too many characters (5+) or ignored the list entirely.

**What works for PuLID:** Simple pose descriptions without numbers. But even then, pose variety is poor.

**What works for Gemini:** Numbered lists work fine. Gemini follows them.

---

### 6. Pose Instructions Create Character Multiplication

**What we tried:** Detailed pose instructions for each character:
```
Left: A 5-year-old boy knight... holding up a golden shield triumphantly, cheering pose.
Center: A 7-year-old boy knight... both arms raised in victory celebration.
Right: A 3-year-old girl knight... waving up at the mama dragon.
```

**What happened:** Flux generated 5+ characters instead of 3. The model got confused by the complexity.

**What works:** Remove pose instructions, let Flux decide poses naturally:
```
Left: A 5-year-old boy knight with short messy brown hair... wearing silver armor with a RED cape.
Center: A 7-year-old boy knight... wearing silver armor with a BLUE cape.
Right: A 3-year-old girl knight... wearing silver armor with a GREEN cape.
```

---

### 7. Cape Colors Need CAPS Emphasis

**What we tried:** "wearing silver armor with a red cape"

**What happened:** Wrong cape colors — got two red capes when we needed red, blue, green.

**What works:** Capitalize the color: "wearing silver armor with a RED cape"

---

### 8. "Left/Center/Right side of image" for Positioning

**What we tried:** "Left: ...", "Center: ...", "Right: ..."

**What happened:** Inconsistent positioning.

**What works:** Be explicit about image position:
- "Left side of image: ..."
- "Center of image: ..."
- "Right side of image: ..."

---

### 9. Style Consistency: "Pixar-adjacent storybook style"

**What we tried:** Various style descriptions including "children's book illustration", "painterly", "watercolor"

**What happened:** Inconsistent styles between generations.

**What works:** "Pixar-adjacent storybook style, soft painterly rendering" — this phrase consistently produces the 3D-ish animated look we want.

---

### 10. Dragon Positioning Requires Explicit Spatial Language

**What we tried:** "baby dragon curled up on a high rocky ledge inside a cave"

**What happened:** Dragon appeared on the ground next to characters.

**What works:** Emphasize spatial relationship:
- "standing at the BOTTOM of a cave, looking UP"
- "baby dragon who is HIGH UP on a rocky ledge near the ceiling"
- "The baby dragon is ABOVE the children on a high ledge, the children are looking UP at the dragon"

---

### 11. Gemini Pro Works Great for Complete Scene Generation (Not Just Sprites!)

**What we tried:** Using Gemini Pro (subscription) for complete scene generation instead of Flux Schnell.

**What happened:** Excellent results! Gemini Pro:
- Follows the same prompt patterns that work for Flux
- Maintains character consistency across all 5 scenes
- Respects "each separately" and character spacing instructions
- Gets outfit colors correct with CAPS emphasis
- Produces consistent Pixar-adjacent storybook style
- Adds nice creative touches (e.g., creature whisperer holding a small creature)

**Comparison:**

| Aspect | Flux Schnell | Gemini Pro |
|--------|--------------|------------|
| Scene quality | ✅ Excellent | ✅ Excellent |
| Character spacing | ✅ With "each separately" | ✅ With "each separately" |
| Color accuracy | ✅ With CAPS | ✅ With CAPS |
| Style consistency | ✅ Good | ✅ Good |
| Cost | ~$0.003/image | Free with Pro subscription |
| Speed | ~1-2 seconds | ~5-10 seconds |
| Accessibility | Requires API setup | Web UI, easy to use |

**Recommendation:** For manual scene generation, Gemini Pro is a great option — especially if you already have a Pro subscription. Same prompt patterns work for both.

---

### 12. Characters Don't Have to Be Knights — Variety Works!

**What we tried:** Instead of three knights with colored capes, we used distinct character types:
- Mountain Climber (RED climbing vest, rope, carabiners)
- Junior Scientist (BLUE lab coat, goggles)
- Creature Whisperer (GREEN nature dress, flower crown)

**What happened:** Gemini handled the diverse character types perfectly:
- Each character remained visually distinct across all scenes
- Role-specific props (rope, goggles, flower crown) appeared consistently
- Different outfit styles didn't confuse the model

**What works:** Mix character types for variety between stories. Just be specific about outfit details and use CAPS for the distinguishing color.

---

## API-Based Image Generation (Automated Pipeline)

This section covers our findings from building the automated image generation CLI tool that uses Google's APIs.

### ⚠️ CRITICAL: Free Tier API Does NOT Work (Jan 2026)

**Despite Google's pricing page claims, free tier API image generation returns `quota limit: 0` for ALL image models.**

- Web UI (aistudio.google.com): Free image generation works manually
- API: Quota is 0 for all image models on free tier projects
- **You MUST have billing enabled for API-based image generation**

We tested multiple projects, keys, models, and SDKs - all return `limit: 0` on free tier.

### API Models Tested

#### Vertex AI Imagen 3 — BLOCKED

| Attribute | Value |
|-----------|-------|
| Models | `imagen-3.0-generate-001`, `imagen-3.0-fast-generate-001` |
| Package | `@google-cloud/aiplatform` |
| Auth | Service account JSON key |
| Result | **BLOCKED** |

**Issue:** Content policy blocks generation of images containing children/minors, even for legitimate children's book illustrations.

**Behavior:** Works fine for landscape-only prompts (e.g., prologue scene with no characters). Any prompt mentioning children with ages or describing young characters fails silently — returns empty predictions array with no error message.

**No workaround found.** No way to get an exception for children's media creators.

---

#### Gemini 2.0 Flash Image Generation — WORKS

| Attribute | Value |
|-----------|-------|
| Model | `gemini-2.0-flash-exp-image-generation` |
| Package | `@google/generative-ai` |
| Auth | `GOOGLE_API_KEY` (free tier available) |
| Result | **SUCCESS** |
| Quality | Good |
| Cost | ~$0.001/image |

**Notes:**
- Successfully generates children characters
- Handles complex multi-character scenes
- Good style consistency with "Pixar-adjacent storybook" prompts
- **Important:** Model name is NOT `gemini-2.0-flash-exp` (that returns 404)

---

#### Gemini 3 Pro Image Preview — WORKS

| Attribute | Value |
|-----------|-------|
| Model | `gemini-3-pro-image-preview` |
| Package | `@google/generative-ai` |
| Auth | `GOOGLE_API_KEY` |
| Result | **SUCCESS** |
| Quality | Better than 2.0 Flash |

**Notes:**
- Higher quality output
- Better detail rendering
- Preview model — may change

---

#### Gemini 2.5 Flash Image — ⚠️ PAID TIER ONLY

| Attribute | Value |
|-----------|-------|
| Model | `gemini-2.5-flash-image` |
| Package | `@google/generative-ai` |
| Auth | `GOOGLE_API_KEY` |
| Result | **SUCCESS** |
| Quality | Best balance of quality and speed |
| Cost | **PAID TIER ONLY** - NOT available on free tier |

**⚠️ WARNING:** Despite working with API key auth, this model is **NOT included in the free tier**. Verified via Google AI Studio web interface (January 2026).

**Notes:**
- Higher quality than 2.0 Flash
- Good character consistency
- **DO NOT USE for free-tier image generation**
- Use `gemini-2.0-flash-exp-image-generation` instead for free usage

---

### API Comparison Table

| Model | Package | Auth Method | Children OK | Quality | API Cost |
|-------|---------|-------------|-------------|---------|----------|
| Imagen 3 | @google-cloud/aiplatform | Service Account | ❌ NO | N/A | $0.04/img |
| Imagen 3 Fast | @google-cloud/aiplatform | Service Account | ❌ NO | N/A | $0.02/img |
| Gemini 2.0 Flash Image | @google/generative-ai | API Key | ✅ YES | Good | ~$0.039/img |
| Gemini 3 Pro Preview | @google/generative-ai | API Key | ✅ YES | Better | ~$0.13/img |
| Gemini 2.5 Flash Image | @google/generative-ai | API Key | ✅ YES | Best | ~$0.039/img |

**⚠️ FREE TIER API STATUS (Verified January 2026):**

ALL image generation models return `quota limit: 0` on free tier API projects:
- `gemini-2.0-flash-exp-image-generation` — ❌ limit: 0 via API
- `gemini-2.5-flash-image` — ❌ limit: 0 via API
- All Imagen models — ❌ limit: 0 via API

**Free image generation ONLY works through the AI Studio web UI, NOT the API.**

---

### API Key Learnings

1. **Vertex AI Imagen has strict content policies** — Cannot generate images of children even for legitimate use cases. No workaround found.

2. **Gemini API is more permissive** — Allows children's book illustrations without issues.

3. **Use API key auth, not service accounts** — The Gemini API uses simple API keys which are easier to manage than GCP service accounts.

4. **Model naming matters** — `gemini-2.0-flash-exp` is NOT the same as `gemini-2.0-flash-exp-image-generation`. Check exact model IDs.

5. **List available models first** — Use the API to list models before assuming a model name:
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" | grep image
   ```

---

### CLI Implementation

See `/src/services/imageGeneration.ts` for the Gemini API implementation.

**CLI usage:**
```bash
# Generate all images for an adventure
npm run generate-images -- --adventure shadow-knight

# Generate only backgrounds
npm run generate-images -- --adventure shadow-knight --type backgrounds

# Generate single image
npm run generate-images -- --adventure shadow-knight --id prologue

# Dry run (preview without generating)
npm run generate-images -- --adventure shadow-knight --dry-run
```

---

## Final Working Prompts

### Complete Scene Prompt Template (Flux Schnell or Gemini Pro)

**Settings (Flux Schnell):**
- Model: black-forest-labs/flux-schnell
- Aspect ratio: 16:9
- Output format: png

**Settings (Gemini Pro):**
- Platform: Google Gemini Pro (web or API)
- Prefix prompt with: "Generate a 16:9 landscape image."

**Template:**
```
[For Gemini: "Generate a 16:9 landscape image."] Three [character types] each separately [ACTION] [LOCATION DESCRIPTION], [ENVIRONMENTAL DETAILS].

Left side of image: A [age]-year-old [boy/girl] [role] with [hair description], [eye description], [skin/cheek description], wearing [OUTFIT with COLOR].

Center of image: A [age]-year-old [boy/girl] [role] with [hair description], [eye description], [skin/cheek description], wearing [OUTFIT with COLOR].

Right side of image: A [age]-year-old [boy/girl] [role] with [hair description], [eye description], [skin/cheek description], wearing [OUTFIT with COLOR].

The three children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on [ground surface], [emotion/expression], Pixar-adjacent storybook style, soft painterly rendering, [lighting description], [mood] atmosphere, children's book illustration.
```

**Example character types:**
- Knights with colored capes (Dragon Knight Rescue)
- Climber / Scientist / Creature Whisperer (Fire Gem Quest)

---

### Scene 1: Stormy Peaks (FINAL)

```
Three young knights each separately standing at the base of a mountain trail, dark purple storm clouds gathering overhead, jagged rocks, a winding path leading upward, distant lightning flash, dramatic mood.

Left side of image: A 5-year-old boy knight with short messy brown hair, big brown eyes, rosy cheeks, wearing silver armor with a RED cape.

Center of image: A 7-year-old boy knight with short brown hair neatly parted, big brown eyes, rosy cheeks, wearing silver armor with a BLUE cape.

Right side of image: A 3-year-old girl knight with shoulder-length wavy reddish-brown hair, big brown eyes, very rosy cheeks, wearing silver armor with a GREEN cape.

The three children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on rocky ground, looking brave and determined, Pixar-adjacent storybook style, soft painterly rendering, dramatic lighting, children's book illustration.
```

---

### Scene 2: Rope Bridge (FINAL)

```
Three young knights each separately crossing a rickety wooden rope bridge over a misty canyon, stormy sky above, wind-blown clouds swirling below, dramatic depth.

Left side of image: A 5-year-old boy knight with short messy brown hair, big brown eyes, rosy cheeks, wearing silver armor with a RED cape.

Center of image: A 7-year-old boy knight with short brown hair neatly parted, big brown eyes, rosy cheeks, wearing silver armor with a BLUE cape.

Right side of image: A 3-year-old girl knight with shoulder-length wavy reddish-brown hair, big brown eyes, very rosy cheeks, wearing silver armor with a GREEN cape.

The three children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on bridge planks, looking brave, Pixar-adjacent storybook style, soft painterly rendering, dramatic atmosphere, children's book illustration.
```

---

### Scene 3: Crystal Cave (FINAL)

```
Three young knights each separately exploring inside a magical crystal cave, glowing purple and blue crystals jutting from walls and ceiling, soft bioluminescent light, tiny dragon footprints visible on the ground, sparkles and magical atmosphere.

Left side of image: A 5-year-old boy knight with short messy brown hair, big brown eyes, rosy cheeks, wearing silver armor with a RED cape.

Center of image: A 7-year-old boy knight with short brown hair neatly parted, big brown eyes, rosy cheeks, wearing silver armor with a BLUE cape.

Right side of image: A 3-year-old girl knight with shoulder-length wavy reddish-brown hair, big brown eyes, very rosy cheeks, wearing silver armor with a GREEN cape.

The three children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on cave floor, looking curious and amazed, Pixar-adjacent storybook style, soft painterly rendering, magical glowing light, children's book illustration.
```

---

### Scene 4: Finding Ember (FINAL)

```
Three young knights each separately standing at the bottom of a cave, looking UP at a cute small orange baby dragon who is HIGH UP on a rocky ledge near the ceiling, lightning visible through cave opening behind them, rain outside, emotional rescue moment.

Left side of image: A 5-year-old boy knight with short messy brown hair, big brown eyes, rosy cheeks, wearing silver armor with a RED cape.

Center of image: A 7-year-old boy knight with short brown hair neatly parted, big brown eyes, rosy cheeks, wearing silver armor with a BLUE cape.

Right side of image: A 3-year-old girl knight with shoulder-length wavy reddish-brown hair, big brown eyes, very rosy cheeks, wearing silver armor with a GREEN cape.

The baby dragon is ABOVE the children on a high ledge, the children are looking UP at the dragon. The three children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on cave floor, Pixar-adjacent storybook style, soft painterly rendering, dramatic warm lighting, children's book illustration.
```

---

### Scene 5: Rainbow Reunion (FINAL)

```
Three young knights each separately celebrating on a grassy hilltop after a storm, brilliant rainbow arcing across the sky behind them, a large friendly mama dragon flying down from the clouds with happy expression, castle towers in the distant background, golden sunset light breaking through clouds.

Left side of image: A 5-year-old boy knight with short messy brown hair, big brown eyes, rosy cheeks, wearing silver armor with a RED cape.

Center of image: A 7-year-old boy knight with short brown hair neatly parted, big brown eyes, rosy cheeks, wearing silver armor with a BLUE cape.

Right side of image: A 3-year-old girl knight with shoulder-length wavy reddish-brown hair, big brown eyes, very rosy cheeks, wearing silver armor with a GREEN cape.

The three children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on grass, celebrating joyfully, Pixar-adjacent storybook style, soft painterly rendering, warm golden lighting, joyful celebration atmosphere, children's book illustration.
```

---

### Fire Gem Quest Prompts (Gemini Pro)

See full prompts at: `quest-family-illustrations/assets/stories/fire-gem-quest/prompts/scene_prompts.md`

**Characters used:**
- Left: 5yo boy Mountain Climber — RED climbing vest, rope, carabiners
- Center: 7yo boy Junior Scientist — BLUE lab coat, goggles on forehead
- Right: 3yo girl Creature Whisperer — GREEN nature dress, flower crown

**Scenes:**
1. The Ashen Path — volcanic landscape, steam vents, embers
2. The Lava River — bubbling lava with floating rock platforms
3. The Ember Caves — glowing orange crystals, multiple tunnels
4. The Fire Guardian — phoenix on pedestal, Fire Gem visible
5. Wish Granted — celebration with King, crown restored

---

## Sprite Sheet Prompt (Gemini)

**Platform:** Google Gemini with photo upload
**Note:** Gemini interprets the face from the photo — not direct injection like PuLID

**Template:**
```
Create a character reference sheet of a [age]-year-old [boy/girl] knight, using the face from the uploaded photo. [N] poses on white background:

1. [Pose 1 description]
2. [Pose 2 description]
3. [Pose 3 description]
4. [Pose 4 description]
5. [Pose 5 description]

[He/She] has [hair description], [eye description], [skin description], wearing silver armor with a [COLOR] cape.

Style: 3D rendered Pixar-adjacent style, soft volumetric lighting, subtle shadows, rounded appealing shapes, the look of a high-end animated movie character, NOT flat illustration.
```

---

### Green Cape Girl Sprite Sheet (FINAL)

```
Create a character reference sheet of a 3-year-old girl knight, using the face from the uploaded photo. 6 poses on white background:

1. Standing neutral, arms relaxed at sides, looking forward
2. Arms stretched OUT WIDE to both sides like balancing on a tightrope
3. Looking UP at the sky, head tilted back, chin raised
4. Both arms RAISED HIGH above head, celebrating with joy
5. Walking forward mid-step, one foot ahead of the other
6. Hands clasped together, hopeful caring expression

She has shoulder-length wavy reddish-brown hair, big brown eyes, very rosy cheeks, wearing silver armor with a GREEN cape.

Style: 3D rendered Pixar-adjacent style, soft volumetric lighting, subtle shadows, rounded appealing shapes, the look of a high-end animated movie character, NOT flat illustration.
```

---

### Red Cape Boy Sprite Sheet (Template)

```
Create a character reference sheet of a 5-year-old boy knight, using the face from the uploaded photo. 6 poses on white background:

1. Standing neutral, arms relaxed at sides, looking forward with determined expression
2. Arms stretched OUT WIDE to both sides like balancing on a tightrope
3. Looking UP at the sky, head tilted back, chin raised
4. Both arms RAISED HIGH above head, celebrating with joy
5. Walking forward mid-step, one foot ahead of the other
6. Holding up fists in brave determined pose

He has short messy brown hair, big brown eyes, rosy cheeks, wearing silver armor with a RED cape.

Style: 3D rendered Pixar-adjacent style, soft volumetric lighting, subtle shadows, rounded appealing shapes, the look of a high-end animated movie character, NOT flat illustration.
```

---

### Blue Cape Boy Sprite Sheet (Template)

```
Create a character reference sheet of a 7-year-old boy knight, using the face from the uploaded photo. 6 poses on white background:

1. Standing neutral, arms relaxed at sides, looking forward confidently
2. Arms stretched OUT WIDE to both sides like balancing on a tightrope
3. Looking UP at the sky, head tilted back, chin raised
4. Both arms RAISED HIGH above head, celebrating with joy
5. Walking forward mid-step, one foot ahead of the other
6. Pointing forward with one arm, leader pose

He has short brown hair neatly parted, big brown eyes, rosy cheeks, wearing silver armor with a BLUE cape.

Style: 3D rendered Pixar-adjacent style, soft volumetric lighting, subtle shadows, rounded appealing shapes, the look of a high-end animated movie character, NOT flat illustration.
```

---

## Background Generation (NOT YET PERFECTED)

**Status:** We have not finalized the background-without-characters generation process.

**Challenge:** Getting a background that matches the complete scene but without characters is tricky. Options we've considered:

1. **Regenerate with "no people" prompt** — Produces different composition, may not match
2. **Inpaint to remove characters** — Can leave artifacts
3. **Describe the scene from the complete image** — Style/composition drift

**Current approach:** For PMF testing, we're using complete scenes (characters baked in). Background-only generation is a future optimization for the sprite compositing pipeline.

**Background prompt template (untested):**
```
[Same scene description as complete scene], no people, no characters, empty scene with clear ground area in the lower third for characters to be added later, Pixar-adjacent storybook style, soft painterly rendering, [lighting], children's book illustration.
```

---

## Settings Reference

### Flux Schnell (Complete Scenes & Backgrounds)

| Setting | Value |
|---------|-------|
| Model | black-forest-labs/flux-schnell |
| aspect_ratio | 16:9 |
| num_outputs | 1 |
| num_inference_steps | 4 |
| output_format | png |
| output_quality | 100 |
| go_fast | true |
| megapixels | 1 |

**Cost:** ~$0.003 per image
**Time:** ~1-2 seconds

---

### Flux PuLID (Sprite Sheets — DEPRECATED, use Gemini instead)

| Setting | Value |
|---------|-------|
| Model | bytedance/flux-pulid |
| width | 1536 |
| height | 768 |
| num_steps | 20 |
| start_step | 0 |
| guidance_scale | 4 |
| id_weight | 1 |
| true_cfg | 1 |
| max_sequence_length | 512 |
| output_format | png |
| output_quality | 100 |
| negative_prompt | bad quality, worst quality, text, signature, watermark, extra limbs |

**Cost:** ~$0.02 per sheet
**Time:** ~17 seconds

**Why deprecated:** Poor pose control. Use Gemini instead.

---

### Gemini Pro (Sprite Sheets — RECOMMENDED)

| Setting | Value |
|---------|-------|
| Platform | Google Gemini (Pro subscription or API) |
| Input | Photo upload + text prompt |
| Output | PNG image |

**Cost:** Free with Pro subscription, ~$0.02-0.04 via API
**Time:** ~5-10 seconds

**Why recommended:** Excellent pose control, follows numbered pose lists, produces distinct poses.

---

### Gemini Pro (Complete Scenes — ALSO WORKS GREAT)

| Setting | Value |
|---------|-------|
| Platform | Google Gemini (Pro subscription or API) |
| Input | Text prompt (prefix with "Generate a 16:9 landscape image.") |
| Output | PNG image |

**Cost:** Free with Pro subscription
**Time:** ~5-10 seconds

**Why it works:** Same prompt patterns as Flux Schnell. Add "Generate a 16:9 landscape image." at the start of the prompt. Gemini follows character spacing, color, and style instructions well.

**Tested with:** Fire Gem Quest story (5 scenes) — all passed quality review.

---

## Prompt Engineering Checklist

When writing scene prompts (Flux Schnell or Gemini Pro):

- [ ] For Gemini: Start with "Generate a 16:9 landscape image."
- [ ] Start with "Three [character type] each separately..."
- [ ] Use "Left side of image:", "Center of image:", "Right side of image:"
- [ ] CAPITALIZE distinguishing colors (RED, BLUE, GREEN)
- [ ] Include "NOT overlapping, NOT touching"
- [ ] Specify "feet visible on [surface]"
- [ ] End with "Pixar-adjacent storybook style, soft painterly rendering"
- [ ] Use 16:9 aspect ratio
- [ ] Don't include specific pose instructions (let model decide)

When writing sprite prompts (Gemini):

- [ ] Upload the child's photo
- [ ] Use numbered pose list with specific descriptions
- [ ] Include "using the face from the uploaded photo"
- [ ] Describe the costume fully (armor, cape color)
- [ ] End with "3D rendered Pixar-adjacent style, NOT flat illustration"
- [ ] Request "white background"

---

## Failed Approaches (For Reference)

### Things that didn't work:

1. **Detailed pose instructions in Flux scenes** — Creates too many characters
2. **"NOT holding hands"** — Model ignores negative pose instructions
3. **1:1 aspect ratio for 3 characters** — Too cramped
4. **PuLID numbered pose lists** — Ignores them completely
5. **PuLID pose descriptions** — Produces similar poses regardless
6. **Lowercase cape colors** — Gets colors wrong
7. **"celebrating together"** — Makes characters touch/hold hands

### Things that worked:

1. **"each separately"** — Key phrase for character spacing
2. **16:9 aspect ratio** — Gives room for 3 characters
3. **Gemini for sprite sheets** — Actually follows pose instructions
4. **Gemini for complete scenes** — Works as well as Flux Schnell, free with Pro subscription
5. **CAPS for colors** — Improves color accuracy
6. **Explicit spatial language** — "HIGH UP", "ABOVE", "looking UP"
7. **No pose instructions** — Let the model decide, get better composition
8. **Varied character types** — Different roles (climber, scientist, whisperer) instead of all knights
9. **Role-specific props** — Rope, goggles, flower crowns stay consistent across scenes

---

---

## Reward/Item Icon Generation

### Overview
Reward icons are small item images shown when players earn treasures during gameplay. These need to work at small sizes (64x64 to 128x128 display) but should be generated larger for quality.

### Working Model & Settings

```typescript
model: 'gemini-2.0-flash-exp-image-generation'  // Requires PAID tier (billing enabled)
```

**Important:** ALL API-based image generation requires billing to be enabled. Free tier API quota is 0 for all image models. Use the paid key from `.env` for image generation.

### Prompt Template for Reward Icons

```
[Item description with visual details]. Fantasy RPG item art style, vibrant colors.

Generate this as a single high-quality illustration with simple or transparent background, suitable for a game reward/item icon. Square aspect ratio preferred.
```

### Prompt Examples by Category

**Weapons:**
```
A glowing magical sword made of living wood and vines, with green leaves growing from the hilt. The blade shimmers with nature magic and has ancient runes carved into it. Fantasy RPG item art style, vibrant colors.
```

**Companions:**
```
A cute magical unicorn with a shimmering rainbow mane and silver horn. Sparkles and stars surround it. Friendly and whimsical fantasy art style, suitable for children. The unicorn looks gentle and kind.
```

**Badges/Medals:**
```
An ornate golden badge with a dragon and knight shield design, encrusted with gems. Prestigious and legendary looking. Fantasy achievement badge style.
```

**Equipment:**
```
Magical boots with small wings on the ankles, glowing with blue speed lines. Adventurous and fast-looking. Fantasy item icon, vibrant colors.
```

**Candy/Whimsical Items:**
```
A magical golden lollipop swirl on a sparkly stick, glowing with warm light. Whimsical and candy-themed. Fantasy candy item icon.
```

### Key Learnings

1. **"Fantasy RPG item art style"** — Produces consistent game-like icons
2. **"vibrant colors"** — Ensures icons pop and are visible at small sizes
3. **"suitable for children"** — For cute/friendly items, adds this for age-appropriate results
4. **Describe the glow/magic** — Items look more magical with "glowing", "shimmering", "sparkles"
5. **Include the emotion** — "friendly", "heroic", "powerful" affects the feel

### Batch Generation Script

Location: `scripts/generateMissingRewards.ts`

```bash
npx tsx scripts/generateMissingRewards.ts
```

Features:
- Generates all missing reward images
- 3-second delay between requests (rate limit safe)
- Skips existing files
- Reports success/failure for each

### Rate Limiting

Free tier allows ~15 requests/minute. With 3-second delay:
- 31 images ≈ 2-3 minutes generation time
- No rate limit errors encountered

---

*Last updated: January 31, 2026*
*Based on manual testing with Dragon Knight Rescue and Fire Gem Quest stories*
*API testing with Shadow Knight adventure*
*Reward icon generation for all adventures*
