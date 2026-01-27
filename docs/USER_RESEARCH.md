# User Research Log

This document captures user testing sessions, feedback, observations, and patterns discovered during testing.

## Research Goals

- Understand how families use the app
- Identify pain points and friction
- Validate design decisions
- Discover unexpected use cases
- Gather feedback on content and UX

## Test Session Template

```markdown
## Test Session - [Date]

**Participants**:
- Parent: [Name, relationship to kids]
- Kids: [Names, ages]
- Total participants: [Number]

**Adventure Tested**: [Candy Volcano / Dragon Knight Rescue / Other]
**Duration**: [Actual play time] (Estimated: [X] minutes)
**Environment**: [Home / Playdate / Other]

### Setup Experience
- Time to create session: [X] minutes
- Time to join session: [X] minutes
- Any confusion during setup: [Notes]

### Prologue Experience
- Did parent read prologue aloud? [Yes/No]
- Kids' attention during prologue: [Engaged / Distracted / Other]
- Was prologue helpful? [Parent feedback]

### Gameplay Observations
- Kids looked at player screen: [Always / Sometimes / Rarely]
- Parent managed DM screen: [Easy / Difficult / Notes]
- Turn order understanding: [Clear / Confusing]
- Choice selection: [Smooth / Issues]
- Dice roll entry: [Easy / Difficult]

### Results & Rewards
- Kids' reaction to results: [Excited / Neutral / Confused]
- Did kids understand rewards? [Yes / No / Notes]
- Animation indicators: [Noticed / Not noticed]

### Ending Experience
- Which ending achieved: [Good / Great / Legendary]
- Kids' reaction to ending: [Notes]
- Parent's reaction to ending: [Notes]

### Direct Quotes

**Parent**:
- "[Quote]"
- "[Quote]"

**Kids**:
- "[Name, age]: [Quote]"
- "[Name, age]: [Quote]"

### Issues Found
1. **[Issue]**: [Description]
2. **[Issue]**: [Description]

### Positive Feedback
- What worked really well: [Notes]
- Favorite moments: [Notes]
- Requests to play again: [Yes/No]

### Follow-up Actions
- [ ] [Action item]
- [ ] [Action item]

### Notes
[Any additional observations or context]
```

---

## Research Sessions

### Test Session — Jan 26, 2026 (v1 playtest)

**Participants:**
- Parent: DM
- Kids: 3 kids (ages 3, 5, 7)
- Total participants: 4

**Adventure Tested:** The Great Candy Volcano
**Duration:** ~15–20 minutes (mealtime)
**Environment:** Home

**What worked well:**
- Full-scene illustrations — kids stayed engaged with big, beautiful images
- Each kid having their own turn — ownership over character actions
- "That's me!" moment — seeing themselves in illustrations landed
- Earning rewards — positive response when shown collected/earned items (even on parent screen)
- 3-year-old enjoyed pictures and being along for the ride despite not fully tracking mechanics

**What didn't work:**
- Kids restless waiting for others' turns (especially with 3 kids cycling)
- Batched results reveal broke immersion — kids lost thread of what they chose by reveal time
- Results overlay covered scene image — boxes/text competed with illustration, distracted kids
- Parent rushed past results to get back to scene image so kids could refocus

**Key insight:** Batched reveal (everyone rolls, then reveal together) created a gap where kids lost connection to choices. Results display competed with scene art instead of enhancing immersion.

**Issues found:** See [BUGS.md](BUGS.md) — BUG-1 (overlays), BUG-2 (batched reveal), BUG-3 (waiting restlessness).

**Follow-up actions:**
- [x] Add bug tracker (BUGS.md)
- [x] Fix player screen overlays (BUG-1)
- [x] Replace batched reveal with immediate per-kid outcome (BUG-2)
- [ ] Re-test with updated flow

---

## Patterns & Insights

### Across Multiple Sessions

**Common Pain Points**:
- Batched reveal creates disconnect; overlays compete with scene art; waiting for others' turns causes restlessness

**What Works Well**:
- Full-scene illustrations; per-kid turns; rewards; "that's me" moment; younger kids happy with visuals

**Age-Specific Observations**:
- **5-year-olds**: [Observations]
- **6-year-olds**: [Observations]
- **7-year-olds**: [Observations]

**Parent Feedback Themes**:
- [Theme 1]
- [Theme 2]

**Kids' Feedback Themes**:
- [Theme 1]
- [Theme 2]

---

## Key Learnings

### Setup & Onboarding
- [Learning about setup process]

### Gameplay
- [Learning about gameplay experience]

### Content
- [Learning about adventure content]

### Technical
- [Learning about technical issues]

---

## Feedback Themes

### Positive Themes
- [Theme]: [Description and examples]

### Negative Themes
- [Theme]: [Description and examples]

### Surprising Findings
- [Finding]: [Description]

---

## Action Items from Research

### High Priority
- [x] Fix player screen overlays (BUG-1)
- [x] Replace batched reveal with immediate per-kid outcome (BUG-2)
- [ ] Re-test with updated flow

### Medium Priority
- [ ] Post-session feedback form (DM)
- [ ] Rewards on player screen / celebration (beyond current results)

### Low Priority
- [ ] [Action from user research]

---

## Research Questions

### Answered
- **Q**: [Question]
- **A**: [Answer based on research]

### Still Open
- [Question to explore in future sessions]

---

## Hypotheses to Test

### H1: First Scene Without Kids (Pending Test - Jan 27, 2026)

**Hypothesis:** The first scene should show the world/setting without the kids in it, introducing the story world first. After the prologue and initial narration, subsequent scenes would include the kid characters. This may create more "magic" in the "that's me!" moment when kids first appear.

**Rationale:**
- The prologue introduces the world verbally
- Currently, kids are visible from Scene 1
- Delaying their visual appearance might let the world description sink in first
- The reveal of "that's me!" could be more impactful if it happens in Scene 2

**Test Plan:**
- Run a playtest session on Jan 27, 2026 evening
- Observe kids' reaction to the current Scene 1 (with kids visible)
- Note whether they comment on seeing themselves immediately
- Ask if they felt the world was established before they "entered" it

**Possible Outcomes:**
- If validated: Update adventure schema to support "intro scene" type without characters, update prompts for Scene 1 to be world-only
- If not validated: Keep current approach where kids appear from Scene 1

**Status:** Pending user research (testing tonight)

---

## Quotes Bank

### Parent Quotes
> "[Quote]" - [Parent name], [Date]

### Kid Quotes
> "[Quote]" - [Kid name, age], [Date]

---

## Metrics to Track

### Quantitative
- Average session duration
- Success rate (ending tiers achieved)
- Setup time
- Number of sessions per family
- Most popular adventures

### Qualitative
- Kids' favorite moments
- Parent pain points
- Content feedback
- Feature requests

---

## Next Research Priorities

1. [Research question or hypothesis to test]
2. [Research question or hypothesis to test]
3. [Research question or hypothesis to test]
