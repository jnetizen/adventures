# Quest Family Adventure Generation Prompt

This is the prompt used to generate v2 adventures (e.g., candy-volcano-v2.json). It defines the structure, tone, and requirements for creating interactive storytelling adventures for Quest Family.

---

You are writing an interactive adventure for Quest Family, a two-screen storytelling app where parents read aloud to children ages 5-7 while kids watch illustrated scenes on an iPad.

## Format Requirements

- Exactly 5 scenes
- 3 characters with distinct personalities and abilities
- Each scene has: narration (1-2 sentences max), then each character gets 1 turn
- Each turn offers 2 choices (both should feel heroic/fun, not "good vs bad")
- Each choice has a success outcome and a fail outcome
- Success threshold: 10+ on d20 (or 5+ for Scene 5 celebration)
- Total play time: ~15 minutes

## Schema Structure

Follow this exact JSON structure:

```json
{
  "id": "kebab-case-id",
  "title": "Adventure Title",
  "description": "1-2 sentence description for selection screen",
  "preview": {
    "tagline": "Exciting hook question for kids (e.g., 'Can you save the day before time runs out?')",
    "themes": ["theme1", "theme2", "theme3"],
    "estimatedMinutes": 15,
    "previewImageUrl": "/images/adventures/[id]-preview.png"
  },
  "prologue": {
    "worldIntro": "2-3 sentences describing the world. Make it sensory and inviting.",
    "characterIntros": [
      {
        "characterId": "character-1-id",
        "introText": "1-2 sentences: personality + what they can do"
      }
    ],
    "missionBrief": "1-2 sentences explaining what heroes need to do (the stakes)"
  },
  "characters": [
    {
      "id": "character-id",
      "name": "Character Name",
      "description": "Brief description of abilities",
      "imageUrl": "/images/characters/[id].png"
    }
  ],
  "scoring": {
    "thresholds": [
      { "minSuccesses": 12, "endingId": "ending-legendary" },
      { "minSuccesses": 8, "endingId": "ending-great" },
      { "minSuccesses": 0, "endingId": "ending-good" }
    ]
  },
  "scenes": [...],
  "endings": [...]
}
```

## Text Length Rules

Keep ALL text short for read-aloud pacing:

| Element | Max Length |
|---------|------------|
| Scene narration | 1-2 sentences |
| Character promptText | Under 10 words |
| Choice label | 3-5 words |
| Success/fail outcome text | 1-2 sentences |
| Ending narrationText | 3-4 sentences |

## Tone Guidelines

- Fails are NEVER punishing — they're silly, funny, and still move the story forward
- Use sensory language kids can imagine (sounds, textures, smells)
- Include at least one joke or silly moment per scene
- Characters should express clear emotions (excited! scared! proud!)
- Avoid: violence, real danger, complex moral dilemmas, anything scary

## Story Arc Template

- **Scene 1:** Hook + introduce the problem (establish urgency)
- **Scene 2:** First obstacle + teamwork moment
- **Scene 3:** Setback, puzzle, or gatekeeper (tension peak)
- **Scene 4:** Emotional core — help someone, fix something, show heart
- **Scene 5:** Victory celebration (5+ thresholds, rewards, joy)

## Choice Design Rules

1. Both choices should feel heroic/fun — never "help vs don't help"
2. Choices should be visually/conceptually distinct (not "freeze it" vs "cool it down")
3. Labels must be concrete ("Give a hug" not "Comfort them emotionally")
4. Each character's choices should use their unique abilities

## Fail Outcome Rules

Every fail outcome MUST:
1. Be funny or silly (kids should want to see fails)
2. Still move the story forward (no dead ends)
3. Often result in something unexpectedly good
4. Never embarrass or punish the character

Good fails: "The spell turns into confetti!", "Trips but discovers a shortcut!", "So bad it's funny and everyone laughs!"

Bad fails: "Nothing happens.", "You feel embarrassed.", "The creature gets angry."

## Rewards

- Scene 2 and Scene 4 should each give one reward in `outcome.rewards`
- Endings give tier-appropriate rewards (legendary gets most, good gets least)
- Reward names should have personality: "Dragon's Thank-You Scale" not "Dragon Scale"
- All rewards need unique `id` fields for persistent tracking

## Rotating Lead Character

Assign `leadCharacterId` to rotate which character goes first each scene:
- Scene 1: Character A
- Scene 2: Character B  
- Scene 3: Character C
- Scene 4: Character A
- Scene 5: Character C (or B)

## Endings

Create exactly 3 endings:

1. **Legendary** (12+ successes): Big celebration, maximum rewards, "heroes of legend" energy
2. **Great** (8-11 successes): Warm celebration, good rewards, "you did great" energy  
3. **Good** (0-7 successes): Still celebratory, basic reward, "you did it together" energy

ALL endings must feel like wins. No sad or disappointed endings.

---

## Generate This Adventure

**Theme:** [THEME]
**Setting:** [SETTING]  
**Characters:** [THREE CHARACTERS WITH DISTINCT ABILITIES]
**Goal:** [SIMPLE GOAL]
**Key obstacle:** [MAIN CHALLENGE]

Generate the complete adventure JSON following all rules above.
