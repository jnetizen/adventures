# Quest Family - Adventure Creation Guide

**Last Updated:** January 30, 2025
**Purpose:** A complete guide to designing and creating Quest Family adventures, based on playtesting learnings and iterative development.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Target Audience & PMF Status](#target-audience--pmf-status)
3. [Story Structure Template](#story-structure-template)
4. [The Critical Branching Pattern](#the-critical-branching-pattern)
5. [Scene-by-Scene Design](#scene-by-scene-design)
6. [The Rapid-Fire Climax](#the-rapid-fire-climax)
7. [Character Design Per Adventure](#character-design-per-adventure)
8. [Theme Selection](#theme-selection)
9. [Writing Narration](#writing-narration)
10. [Roll Design](#roll-design)
11. [Reward Systems](#reward-systems)
12. [Image Generation](#image-generation)
13. [Video Climax (Optional)](#video-climax-optional)
14. [JSON Structure Reference](#json-structure-reference)
15. [Checklist: New Adventure](#checklist-new-adventure)

---

## Design Philosophy

### Core Principles

1. **Family engagement over individual optimization** - If any family member disengages, the whole experience fails. Design for the full age range (3-7) simultaneously.

2. **"Cool" for older kids, "safe" for younger kids** - Alexander (7) wants Zelda-style combat and mastery. Isabella (3) needs wonder without scary environmental peril. These can coexist through branching paths.

3. **Immediate feedback, always** - Children lose connection to their choices when results are delayed. Show cutscenes right after each roll, never batched.

4. **The climax must be interactive** - Kids expect to roll at the end. A narration-only finale deflates all built-up energy. Always include rolls + cutscenes in Scene 4.

5. **Fail states should be funny, not punishing** - All outcomes move the story forward. "Failure" means a different path to success, not actual failure.

### What We've Validated

| Learning | Source |
|----------|--------|
| Cutscene overlays after rolls improve engagement | Frozen Volcano playtest |
| Same success/fail cutscene works for 5yo (cost savings) | Oliver didn't notice |
| Personalized character representation creates magic | Isabella's reaction |
| Branching for oldest child increases engagement | Alexander "forbid" family from continuing without him |
| Pure narration climax kills replay desire | Frozen Volcano v1 failure |
| Rapid-fire climax (BOOM BOOM BOOM) builds excitement | Frozen Volcano v2 design |

### What Doesn't Work

| Anti-pattern | Why |
|--------------|-----|
| Environmental peril for youngest | Isabella got anxious about "falling into volcano" |
| Waiting too long during siblings' turns | Alexander "still doesn't like waiting" |
| Chance-only mechanics for 7yo | Alexander wants agency/skill, not just luck |
| No rolls in climax scene | Kids rolled anyway and demanded cutscenes |
| Scary creatures (ghosts, etc.) | Too scary for Isabella |

---

## Target Audience & PMF Status

### Current Test Family

| Child | Age | PMF Status | Key Insight |
|-------|-----|------------|-------------|
| Isabella | 3 | ✅ Confirmed | Demands to play, chooses over Netflix |
| Oliver | 5 | ⚠️ Engaged | Follows older brother's lead |
| Alexander | 7 | ❌ Testing | Enjoys but doesn't request replay - critical unsolved problem |

### Alexander's Specific Feedback

Direct quotes that should guide design:

- **"Different things that happen to ME"** → Give him unique story threads
- **"Could we each choose a different path and meet up at the end"** → Branching structure
- **"Likes getting the treasure"** → Concrete, personal rewards
- **"Two turns in a row rather than one"** → More content per turn in his solo scenes

### Age-Appropriate Content Guidelines

| Age | Wants | Avoid |
|-----|-------|-------|
| 3yo (Isabella) | Sparkles, unicorns, magical creatures, being a princess/rider, cute companions | Environmental danger, scary creatures, combat alone |
| 5yo (Oliver) | Fire powers, action, helping siblings, treasure | Complex choices, too much waiting |
| 7yo (Alexander) | Combat, legendary weapons, solo mastery moments, Zelda-style atmosphere, skill-based challenges | Babyish themes, pure luck mechanics, not enough content |

---

## Story Structure Template

### The 7-Scene Framework

Every adventure follows this structure:

| Scene | Type | Characters | Purpose |
|-------|------|------------|---------|
| **Prologue** | Narration | None | Set the stakes, introduce the world |
| **Scene 1** | Interactive | All 3 | Everyone rolls, Alexander splits off at end |
| **Scene 2A** | Interactive | Alexander solo | Find legendary weapon/item |
| **Scene 2B** | Interactive | Oliver + Isabella | Wonder/discovery, Isabella finds companion |
| **Scene 3A** | Interactive | Alexander solo | Use weapon, skill/mastery moment |
| **Scene 3B** | Interactive | Oliver + Isabella | Oliver finds HIS special item |
| **Scene 4** | Climax | All 3 | Rapid-fire rolls, boss defeat, ALWAYS SUCCEED |
| **Scene 5** | Narration | All 3 | Victory, rewards given, THE END |

### Duration Target

- **Total:** 15-20 minutes
- **Per scene:** 2-3 minutes
- **Climax:** Should feel fast and exciting, not drawn out

---

## The Critical Branching Pattern

### Why Branching Matters

Alexander's engagement depends on having **his own story thread**. He said he wants "different things that happen to ME" and "each choose a different path."

### The Split Structure

```
Scene 1 (All together)
    │
    ├── Scene 2A (Alexander solo) ──► Scene 3A (Alexander solo)
    │                                        │
    └── Scene 2B (Oliver + Isabella) ──► Scene 3B (Oliver + Isabella)
                                             │
                                    Scene 4 (All reunite for climax)
```

### Key Design Rules

1. **Alexander's path** should be atmospheric, mysterious, skill-based
   - Zelda "Lost Woods" vibes
   - Finding legendary weapons
   - Guardian challenges he overcomes through courage/mastery

2. **Oliver + Isabella's path** should be sunny, magical, wonder-based
   - Friendly creatures (Korok-style spirits, unicorns)
   - No environmental peril
   - Isabella befriends a companion
   - Oliver gets his OWN hero moment (treasure chest, special item)

3. **Both paths converge** for the climax so the family is together for the finale

---

## Scene-by-Scene Design

### Prologue

**Purpose:** Set stakes, introduce world, build anticipation

**Rules:**
- Narration only (no rolls)
- Introduce the threat/problem
- Name all three heroes with their roles
- End with "Are you ready?"
- Background image: Show the world, no characters

**Template:**
```
[Describe the magical place]

But something is wrong.

[Describe the threat/problem]

Three heroes have come to [save/help/rescue]. A [Oliver's role] with [power]. A [Isabella's role] who [ability]. And a [Alexander's role] who can [skill].

[Final setup line]

Are you ready?
```

### Scene 1: The Entrance

**Purpose:** Everyone proves themselves, Alexander discovers the branching path

**Rules:**
- All 3 characters roll
- Order: Oliver → Isabella → Alexander
- Alexander's roll reveals the "secret path" only he can see
- End with transition where Alexander splits off

**Roll Design:**
- Oliver: Physical/fire challenge
- Isabella: Beauty/sparkle/charm challenge  
- Alexander: Perception/skill challenge that reveals hidden path

### Scene 2A: Alexander's Discovery

**Purpose:** Alexander finds his legendary weapon

**Rules:**
- Solo scene, atmospheric/mysterious
- Guardian or challenge he must face alone
- Reward: Legendary weapon he'll use in climax
- Should feel "cool" and mature

### Scene 2B: Oliver + Isabella's Discovery

**Purpose:** Isabella befriends a companion

**Rules:**
- Sunny, magical atmosphere
- A creature needs help (trapped, scared, lost)
- Oliver helps free it, Isabella bonds with it
- Reward: Companion that will fight alongside Isabella in climax

### Scene 3A: Alexander's Mastery

**Purpose:** Alexander uses his new weapon

**Rules:**
- Solo scene, dramatic challenge
- He must use the weapon from 2A to overcome obstacle
- Should feel like a skill/mastery moment
- Ends with him seeing the final destination

### Scene 3B: Oliver's Hero Moment

**Purpose:** Oliver gets HIS special item

**Rules:**
- Hidden treasure/chest that only a [Oliver's role] can open
- He earns his climax weapon (gauntlets, shield, etc.)
- Isabella prepares with her companion (mounts unicorn, etc.)
- Ends with them racing to rejoin Alexander

### Scene 4: The Climax

**Purpose:** Epic boss defeat with all three heroes

**See [The Rapid-Fire Climax](#the-rapid-fire-climax) section for detailed design**

### Scene 5: Victory

**Purpose:** Celebrate, give rewards, close the story

**Rules:**
- Narration only (no rolls)
- World is restored/saved
- Each child receives their reward formally
- End with "THE END" and hint at future adventures

---

## The Rapid-Fire Climax

### Why This Pattern Works

The original Frozen Volcano had no rolls in Scene 4 - just narration. The kids' energy deflated. They rolled anyway and demanded cutscenes.

The fix: **Rapid-fire climax mode**

### The Sequence

1. **Setup narration** - Boss appears, stakes are clear
2. **DM announces the plan** - "Oliver strikes first, Isabella charges next, Alexander lands the final blow!"
3. **All three kids roll** - Builds anticipation (Oliver → Isabella → Alexander)
4. **"HERE WE GO!"** - Trigger phrase
5. **Cutscenes play rapid-fire** - BOOM → CRASH → SHATTER (no pauses)
6. **Resolution narration** - Boss defeated, victory

### JSON Flags

```json
{
  "isClimax": true,
  "climaxMode": "rapid-fire",
  "characterTurns": [
    {
      "character": "oliver",
      "alwaysSucceed": true,
      "outcome": { ... }
    }
  ]
}
```

### Key Rules

- **`alwaysSucceed: true`** - No fail states in climax. The dice roll is for excitement, not gatekeeping.
- **Order matters** - Oliver → Isabella → Alexander. Alexander ALWAYS strikes last (final hero moment).
- **No pauses** - Cutscenes should feel like an action montage
- **Sound effects in narration** - BOOM! CRASH! SHATTER!

### Video Climax Option

For extra impact, generate a 5-7 second video showing all three attacks in sequence with sound effects. DM can choose between:
- Static cutscenes (one at a time)
- Video sequence (all three as animated montage)

---

## Character Design Per Adventure

### Don't Reuse Characters Across Adventures

Each adventure should have **fresh character identities** to keep things exciting:

| Adventure | Alexander | Oliver | Isabella |
|-----------|-----------|--------|----------|
| Frozen Volcano | Frost Scout (BLUE) | Ember Keeper (ORANGE) | Crystal Singer (PINK) |
| Shadow Knight | Shadow Ranger (DARK GREEN) | Flame Striker (ORANGE) | Sparkle Rider (PINK) |

### Character Design Template

For each adventure, define:

```json
{
  "characters": {
    "alexander": {
      "name": "Alexander",
      "role": "[Cool title]",
      "color": "[CAPS COLOR]",
      "description": "[Physical + outfit for image prompts]"
    },
    "oliver": {
      "name": "Oliver", 
      "role": "[Action title]",
      "color": "ORANGE",
      "description": "[Physical + outfit for image prompts]"
    },
    "isabella": {
      "name": "Isabella",
      "role": "[Magical/cute title]", 
      "color": "PINK",
      "description": "[Physical + outfit for image prompts]"
    }
  }
}
```

### Physical Descriptions (Consistent Across All Adventures)

These stay the same - only outfits change:

- **Alexander (7yo):** Short slightly messy brown hair, brown eyes, rosy cheeks
- **Oliver (5yo):** Short slightly messy brown hair, brown eyes, rosy cheeks
- **Isabella (3yo):** Brown hair just past shoulders, big brown eyes, very rosy cheeks

---

## Theme Selection

### Themes That Work

| Theme | Alexander's Vibe | Isabella's Vibe | Example |
|-------|------------------|-----------------|---------|
| Zelda Forest | Misty woods, legendary sword | Sunny grove, unicorn, Koroks | Shadow Knight |
| Ice/Fire | Frost powers, ice caves | Crystal singing, sparkly ice | Frozen Volcano |
| Underwater | Deep sea explorer | Colorful reef, friendly fish | Rainbow Reef |
| Sky/Clouds | Storm navigator | Rainbow bridges, cloud creatures | (untested) |
| Ancient Ruins | Puzzle solver, artifact hunter | Magical glyphs, friendly spirits | (untested) |

### Themes to Approach Carefully

| Theme | Risk | Mitigation |
|-------|------|------------|
| Haunted/Spooky | Too scary for Isabella | Don't use ghosts, make it "mysterious" not scary |
| Lava/Volcano | Environmental peril anxiety | Keep Isabella away from "falling" scenarios |
| Combat-heavy | Isabella uncomfortable | Her combat should always have a protector (unicorn, etc.) |

### Theme Selection Process

1. **What's "cool" to Alexander?** (Zelda, Mario Odyssey references)
2. **What's magical/safe for Isabella?** (Unicorns, sparkles, friendly creatures)
3. **Can we split the atmosphere?** (Alexander gets mysterious, Isabella gets sunny)
4. **What's the boss/climax?** (Should be defeatable by all three working together)

---

## Writing Narration

### Voice & Tone

- **Read-aloud friendly** - Parent is the DM reading this aloud
- **Short sentences** - Kids are listening, not reading
- **Sound effects** - WHOOSH, BOOM, CRASH (kids love these)
- **Direct address** - "Oliver! The spirit points to..."
- **Questions to build anticipation** - "Are you ready?"

### Narration Types

**Scene Narration** (setting the scene):
```
You stand at the edge of the Ancient Grove. The trees here are still green, 
but you can see the gray creeping in deeper ahead.

A tiny forest spirit peeks out from behind a mushroom. It looks scared - 
but when it sees you, it chirps hopefully.
```

**Roll Prompts** (direct, exciting):
```
Oliver! The spirit points to a pile of wet leaves blocking the path. 
'Can you light the way?'
```

**Success Outcomes** (triumphant):
```
Oliver holds up his fist and WHOOSH - flames burst from his hand, 
burning through the leaves and clearing the path! The spirit cheers.
```

**Fail Outcomes** (still positive, just different):
```
Oliver's flames sputter in the damp air - but he doesn't give up! 
He concentrates harder and the fire grows stronger, slowly burning through the leaves.
```

**Transitions** (move the story forward):
```
Alexander pulls up his hood and steps into the mist. In seconds, 
he's vanished between the trees - like a shadow.

Oliver and Isabella - the spirit tugs at your hands. 
'This way! I'll take you the sunny path. My friends will help you!'

The heroes split up. But they'll meet again soon.
```

### Narration Don'ts

- ❌ Long paragraphs (kids zone out)
- ❌ Complex vocabulary
- ❌ Ambiguous outcomes
- ❌ Scary descriptions for Isabella's scenes
- ❌ Passive voice

---

## Roll Design

### Standard Roll

```json
{
  "roll": {
    "dc": 10,
    "outcomes": {
      "success": {
        "narration": "...",
        "cutscene": "/images/cutscenes/..."
      },
      "fail": {
        "narration": "...",
        "cutscene": "/images/cutscenes/..."
      }
    }
  }
}
```

### Climax Roll (Always Succeed)

```json
{
  "alwaysSucceed": true,
  "outcome": {
    "narration": "...",
    "cutscene": "/images/cutscenes/..."
  }
}
```

### DC Guidelines

- **DC 10** is standard (50% success on d20)
- Consider: Should this roll ever "fail"? If failure would feel bad, use `alwaysSucceed`
- All climax rolls use `alwaysSucceed: true`

### Cost Optimization

**Validated learning:** Oliver (5yo) didn't notice when success/fail cutscenes were identical.

For younger kids, you can use the same cutscene for both outcomes to save image generation costs. Only Alexander (7yo) needs distinct success/fail variants.

---

## Reward Systems

### Why Rewards Matter

Alexander specifically said he likes "getting the treasure." Concrete, personal rewards increase engagement.

### Reward Types

| Type | Example | When Given |
|------|---------|------------|
| Legendary Weapon | Grove Blade, Frost Blade | Scene 2A (Alexander) |
| Power Item | Flame Gauntlets, Fire Bow | Scene 3B (Oliver) |
| Companion | Unicorn, Dragon Friend | Scene 2B (Isabella) |
| Story MacGuffin | Heart of the Grove | Scene 5 (shared victory) |

### Reward JSON Structure

```json
{
  "reward": {
    "item": "Grove Blade",
    "description": "An ancient sword that glows with forest magic"
  }
}
```

### Scene 5 Reward Ceremony

Always formally give each child their reward:

```json
{
  "rewards": [
    {
      "character": "oliver",
      "narration": "Oliver, the Flame Gauntlets are yours. Whenever you need power, they'll burn bright.",
      "item": "Flame Gauntlets"
    },
    ...
  ]
}
```

---

## Image Generation

### Current Pipeline

**Model:** Gemini 2.5 Flash Image
**Cost:** ~$0.039 per image
**Total per adventure:** ~$0.90 for 23 images

### Image Count Per Adventure

| Type | Count | Examples |
|------|-------|----------|
| Backgrounds | 8 | Prologue, Scene 1-5, Scene 2A, 2B, 3A, 3B |
| Cutscenes | 15 | Success/fail variants for each roll |
| **Total** | **23** | |

### Prompt Patterns That Work

Based on extensive testing:

1. **Start with:** `Generate a 16:9 landscape image.`
2. **Multiple characters:** Use `each separately` early in prompt
3. **Spacing:** `NOT overlapping, NOT touching`
4. **Positioning:** `Left side of image:` / `Center of image:` / `Right side of image:`
5. **Colors:** CAPITALIZE important colors (ORANGE, DARK GREEN, PINK)
6. **Grounding:** `feet visible on [surface]`
7. **Style:** End with `Pixar-adjacent storybook style, soft painterly rendering, children's book illustration`
8. **Poses:** NO detailed pose instructions in multi-character scenes (causes character multiplication)

### Background Prompt Template

```
Generate a 16:9 landscape image. [Number] young heroes each separately [action] in [location description], [environmental details].

Left side of image: [Oliver's full description]

Center of image: [Character description OR Alexander if 3 characters]

Right side of image: [Isabella's full description]

The [number] children are spread apart with clear space between each of them, NOT overlapping, NOT touching, feet visible on [surface], [emotion/expression], [atmosphere], Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.
```

### Cutscene Prompt Template

```
Generate a 16:9 landscape image. [Character full description], [action they're taking], [environmental context], [supporting elements like spirits/creatures], [background setting], [lighting], [expression], feet visible on [surface], Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.
```

### Climax Cutscene Additions

For climax cutscenes, add:
- Sound effect words: `BOOM effect`, `CRASH effect`
- Impact visuals: `flames and sparks exploding`, `armor CRACKING and SHATTERING`
- Dynamic language: `throwing a massive punch`, `leaping through the air`

---

## Video Climax (Optional)

### When to Use

The video climax is optional but adds significant impact for the final battle moment. Use when:
- You want maximum "wow" factor
- Testing if video increases Alexander's engagement
- The adventure has a particularly epic boss fight

### Generation Process

1. Generate all 3 static climax cutscenes first
2. Use those images as reference for the video prompt
3. Generate a 5-7 second video combining all three attacks

### Video Prompt Template

```
Create a 6-second animated action sequence video. Reference the attached images for character designs.

SHOT 1 (0-2 seconds): [Oliver's attack description with BOOM effect]

SHOT 2 (2-4 seconds): [Isabella's attack description with CRASH effect]

SHOT 3 (4-6 seconds): [Alexander's final strike description with SHATTER effect]

Style: Pixar-adjacent 3D animation, dramatic [setting] background, epic boss battle energy, fast action cuts.
```

### DM Screen Integration

The DM should have a choice:
- **"Play Cutscenes"** - Shows 3 static images one at a time
- **"Play Video"** - Plays the single video with all three attacks + sound

---

## JSON Structure Reference

### Adventure Root

```json
{
  "id": "adventure-slug",
  "title": "Adventure Title",
  "theme": "theme-name",
  "estimatedDuration": "15-20 minutes",
  "characters": { ... },
  "scenes": [ ... ]
}
```

### Scene Types

**Narration Scene:**
```json
{
  "id": "prologue",
  "type": "narration",
  "title": "Scene Title",
  "background": "/images/backgrounds/...",
  "narration": "...",
  "nextScene": "scene-1"
}
```

**Interactive Scene:**
```json
{
  "id": "scene-1",
  "type": "interactive",
  "title": "Scene Title",
  "background": "/images/backgrounds/...",
  "narration": "...",
  "characterTurns": [ ... ],
  "transition": "...",
  "nextScene": "scene-2"
}
```

**Branching Scene:**
```json
{
  "id": "scene-1",
  "type": "interactive",
  ...
  "branches": {
    "alexander": "scene-2a",
    "oliver_isabella": "scene-2b"
  }
}
```

**Climax Scene:**
```json
{
  "id": "scene-4",
  "type": "interactive",
  "isClimax": true,
  "climaxMode": "rapid-fire",
  "climaxVideoUrl": "/images/cutscenes/.../scene4-climax-video.mp4",
  "setupNarration": "...",
  "rapidFireIntro": "HERE WE GO!",
  "characterTurns": [
    {
      "character": "oliver",
      "alwaysSucceed": true,
      "outcome": { ... }
    }
  ],
  "resolution": "..."
}
```

---

## Checklist: New Adventure

### Planning Phase

- [ ] Choose theme (cool for Alexander, safe for Isabella)
- [ ] Define character roles and colors
- [ ] Outline the threat/problem
- [ ] Design the boss/climax
- [ ] Plan Alexander's legendary weapon
- [ ] Plan Isabella's companion
- [ ] Plan Oliver's special item

### Writing Phase

- [ ] Write prologue narration
- [ ] Write Scene 1 (all together, Alexander splits)
- [ ] Write Scene 2A (Alexander finds weapon)
- [ ] Write Scene 2B (Isabella finds companion)
- [ ] Write Scene 3A (Alexander uses weapon)
- [ ] Write Scene 3B (Oliver finds item)
- [ ] Write Scene 4 climax (rapid-fire)
- [ ] Write Scene 5 victory + rewards

### JSON Phase

- [ ] Create adventure JSON with all scenes
- [ ] Add character definitions
- [ ] Add all roll prompts and outcomes
- [ ] Add reward objects
- [ ] Set climax flags (`isClimax`, `climaxMode`, `alwaysSucceed`)
- [ ] Verify scene flow (nextScene, branches)

### Image Phase

- [ ] Write 8 background prompts
- [ ] Write 15 cutscene prompts
- [ ] Generate images via Gemini 2.5 Flash
- [ ] Review for quality/consistency
- [ ] Save to correct paths

### Video Phase (Optional)

- [ ] Generate climax video from static images
- [ ] Add video URL to JSON
- [ ] Test DM screen toggle

### Testing Phase

- [ ] Load adventure in app
- [ ] Test full playthrough
- [ ] Verify all images load
- [ ] Verify climax rapid-fire works
- [ ] Playtest with kids
- [ ] Document learnings

---

## Appendix: Example Adventures

### Shadow Knight and the Lost Grove

- **Theme:** Zelda-style forest
- **Boss:** Shadow Knight holding the Heart of the Grove
- **Alexander:** Shadow Ranger (DARK GREEN) → Grove Blade
- **Oliver:** Flame Striker (ORANGE) → Flame Gauntlets
- **Isabella:** Sparkle Rider (PINK) → Unicorn companion

### Frozen Volcano

- **Theme:** Ice and fire
- **Boss:** Dragon protecting frozen volcano
- **Alexander:** Frost Scout (BLUE) → Frost Blade
- **Oliver:** Ember Keeper (ORANGE) → Fire torch
- **Isabella:** Crystal Singer (PINK) → Crystal magic

---

*This guide will be updated as we learn more from playtesting.*
