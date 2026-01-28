# Testing Guide

This document outlines the testing process, feedback capture, and bug reporting for the Adventures app.

## Pre-Testing Setup

### Devices Needed
- **DM Device**: Phone or tablet (parent/guardian)
- **Player Device**: iPad or tablet (kids)
- Both devices should be on the same WiFi network

### Environment Setup
1. Ensure development server is running: `npm run dev`
2. Both devices should access the same URL (e.g., `http://localhost:5173` or deployed URL)
3. Have Supabase connection verified (check ConnectionStatus indicator)

### Adventure Preparation
- Verify adventure JSON files are in `src/data/adventures/`
- Check that scene images exist in `public/images/scenes/`
- Ensure character images exist in `public/images/characters/` (if used)

## Test Scenarios

### Happy Path - Full Adventure Flow

1. **Session Creation**
   - [ ] DM creates session, room code appears
   - [ ] Player joins with room code successfully
   - [ ] Connection status shows "Connected" on both screens

2. **Adventure Selection**
   - [ ] DM sees adventure selection screen with preview cards
   - [ ] Can select an adventure (Candy Volcano or Dragon Knight Rescue)
   - [ ] Adventure loads successfully

3. **Player Setup**
   - [ ] DM enters kid names (1-3 kids)
   - [ ] DM assigns each kid to a character
   - [ ] Character preview shows correctly

4. **Prologue**
   - [ ] Prologue screen appears after character assignment
   - [ ] World intro, character intros, and mission brief display correctly
   - [ ] "Start Adventure" button proceeds to Scene 1

5. **Scene Play**
   - [ ] Scene narration displays on DM screen
   - [ ] Scene image displays full-screen on player screen
   - [ ] Character turns appear in order
   - [ ] DM can select choice and enter dice roll
   - [ ] Success count increments on successful rolls (check DM header)
   - [ ] All characters act before reveal

6. **Results Reveal**
   - [ ] "Reveal Results" button appears after all turns
   - [ ] Results display on both DM and player screens
   - [ ] Animation indicators show for each outcome
   - [ ] Scene outcome and rewards display correctly

7. **Scene Progression**
   - [ ] "Next Scene" button advances to next scene
   - [ ] Scene number increments correctly
   - [ ] Success count persists across scenes

8. **Ending**
   - [ ] On final scene, tiered ending displays
   - [ ] Ending matches success count (good/great/legendary)
   - [ ] Ending rewards display correctly
   - [ ] "End Adventure" and "Start New Adventure" buttons work

### Edge Cases

- [ ] **Empty room code**: Player tries to join with empty code
- [ ] **Invalid room code**: Player enters non-existent code
- [ ] **Network interruption**: Test behavior when WiFi drops
- [ ] **Multiple players**: Test with 2-3 kids
- [ ] **Single player**: Test with 1 kid
- [ ] **Session timeout**: Leave session idle for extended period
- [ ] **Browser refresh**: Refresh DM or player screen mid-adventure
- [ ] **Low success count**: Test ending calculation with 0-7 successes
- [ ] **High success count**: Test ending calculation with 12+ successes

## Feedback Questions

### For Parents (DM)

**Before Starting:**
- Is the setup process clear? (creating session, selecting adventure)
- How long did it take to get started?

**During Play:**
- Is the DM interface easy to use?
- Can you read the narration text clearly?
- Is the dice roll input intuitive?
- Do you understand the success count indicator?

**After Completion:**
- How long did the adventure take? (compare to estimatedMinutes)
- Was the prologue helpful for setting context?
- Did the tiered ending feel rewarding?
- What was confusing or unclear?
- What worked really well?

### For Kids (Players)

**During Play:**
- Can you see the scene images clearly?
- Do you understand whose turn it is?
- Are the results exciting to watch?
- Do you like the rewards?

**After Completion:**
- What was your favorite part?
- What was confusing?
- Would you want to play again?

## Observation Checklist

### UX Observations
- [ ] Kids look at player screen (not DM screen)
- [ ] Kids understand turn order
- [ ] Kids react to results/rewards
- [ ] Parent can manage DM screen while watching kids
- [ ] Text is readable on both devices
- [ ] Buttons are tappable (not too small)
- [ ] Loading states are clear

### Technical Observations
- [ ] Real-time sync works (no delays)
- [ ] Images load correctly
- [ ] No console errors
- [ ] No network errors
- [ ] Success count updates correctly
- [ ] Scene transitions are smooth
- [ ] No crashes or freezes

### Content Observations
- [ ] Narration text is appropriate length
- [ ] Choice labels are clear
- [ ] Outcomes are fun (even failures)
- [ ] Prologue sets up story well
- [ ] Ending feels satisfying

## Bug Report Template

When reporting bugs, include:

```markdown
**Bug Title**: [Brief description]

**Severity**: [Critical / High / Medium / Low]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Environment**:
- Device: [Phone/Tablet model]
- Browser: [Chrome/Safari/etc]
- Adventure: [Which adventure]
- Scene: [Which scene if applicable]

**Screenshots/Logs**:
[If applicable]

**Additional Context**:
[Any other relevant information]
```

## Testing v2 Features Checklist

### Adventure Selection
- [ ] Both adventures appear in selection screen
- [ ] Preview images display (or placeholder)
- [ ] Tagline, themes, estimated time show correctly
- [ ] Selection works and loads adventure

### Prologue
- [ ] Prologue appears after character assignment
- [ ] World intro displays correctly
- [ ] All character intros show with character images
- [ ] Mission brief is clear
- [ ] "Start Adventure" proceeds to Scene 1

### Cumulative Scoring
- [ ] Success count starts at 0
- [ ] Success count increments on successful rolls (roll >= threshold)
- [ ] Success count does NOT increment on failed rolls
- [ ] Success count persists across scenes
- [ ] Success count resets when starting new adventure
- [ ] Success count displays in DM header (subtle, parent-only)

### Tiered Endings
- [ ] Ending calculation uses correct thresholds
- [ ] Good ending (0-7 successes) displays correctly
- [ ] Great ending (8-11 successes) displays correctly
- [ ] Legendary ending (12+ successes) displays correctly
- [ ] Ending title, narration, and rewards display
- [ ] Ending shows on both DM and player screens

### Reward System
- [ ] Scene rewards display with name, type, imageUrl (if available)
- [ ] Ending rewards display correctly
- [ ] Reward images load (or placeholder shows)
- [ ] Reward type (item/token/badge) is visible

## Known Issues Log

**Active bugs are tracked in [docs/BUGS.md](BUGS.md).** Fix bugs there and move to "Fixed" when done.

### Quick reference
- **BUG-1:** Player screen overlays obscure scene image — **Fixed**
- **BUG-2:** Batched reveal gap — **Fixed** (progressive outcomes, no Reveal step)
- **BUG-3:** "All acted / waiting for reveal" adds restlessness — **Fixed** (via BUG-2)

### Legacy template (use BUGS.md for new bugs)
- **Description**: 
- **Severity**: 
- **Status**: [Open / In Progress / Fixed]
- **Notes**:

## Testing Session Template

```markdown
## Test Session - [Date]

**Participants**:
- Parent: [Name]
- Kids: [Names and ages]

**Adventure Tested**: [Candy Volcano / Dragon Knight Rescue]

**Duration**: [Actual time vs estimated]

### Key Observations
- 

### Quotes
- Parent: "[quote]"
- Kid: "[quote]"

### Issues Found
1. 

### Positive Feedback
- 

### Follow-up Actions
- [ ] 
```

---

## Manual Validation Checklist

A runnable checklist for systematically testing the app end-to-end.

### Pre-Test Setup

- [ ] `npm run dev` running; both DM and Player use same origin
- [ ] Two devices or two browser windows (one DM, one Player)
- [ ] Supabase env vars set; migrations applied (`npm run db:migrate`)
- [ ] Optional: DevTools → Network → "Offline" available for offline tests

### Setup and Joining

- [ ] **Landing** – "Start as DM" → `/dm`, "Join as Player" → `/play`
- [ ] **Create session** – DM: create session → room code appears
- [ ] **Join** – Player: enter room code → join success; ConnectionStatus "Connected" on both
- [ ] **Invalid code** – Wrong code → clear error (no crash)
- [ ] **Empty code** – Join with empty code → handled gracefully

### Adventure Selection and Prologue

- [ ] **Adventure list** – DM sees adventures with preview, tagline, themes, time
- [ ] **Select adventure** – Pick one → loads; no errors
- [ ] **Character assignment** – Enter 1–3 kid names; assign each to a character
- [ ] **Prologue** – world intro, character intros, mission brief; "Start Adventure" → Scene 1

### Scene Play (DM)

- [ ] **Narration** – Scene text and choices for current character turn
- [ ] **Dice** – Manual input works; DiceRoller rolls correctly, fills input
- [ ] **Choices** – Select choice, enter/roll dice, submit; next character turn
- [ ] **Progressive outcomes** – No "Reveal Results" step; outcome appears per choice
- [ ] **Success count** – Shown on DM; increments when roll ≥ threshold; persists across scenes

### Scene Play (Player)

- [ ] **Full-screen scene** – PlayPage shows only scene image during play
- [ ] **Scene changes** – New scene → new image when DM advances

### Rewards and Progression

- [ ] **Scene rewards** – RewardCelebration appears on both DM and Player
- [ ] **Next scene** – "Next Scene" → DM and Player advance
- [ ] **Ending rewards** – On final scene, ending celebration if ending has rewards

### Ending and Feedback

- [ ] **Tiered ending** – Matches success count: good (0–7), great (8–11), legendary (12+)
- [ ] **End Adventure** – Feedback form; submit → session reset for new adventure

### Error Recovery

- [ ] **Session persistence** – Refresh → "Recover Session" offered
- [ ] **Recover** – Rejoin same session; state consistent
- [ ] **Errors** – Messages are user-friendly (no raw stack traces)

### Offline Mode

- [ ] **Offline** – Go offline; ConnectionStatus shows "Offline"
- [ ] **Play offline** – Actions queue; no crash
- [ ] **Back online** – Status → "Syncing" then "Connected"; pending ops synced

### Edge Cases

- [ ] **Single player** – One kid, one character; full flow works
- [ ] **Three players** – Three kids, three characters; turns and rewards correct
- [ ] **Browser refresh** – Refresh mid-scene; recover and continue
- [ ] **Low vs high success** – Verify good vs legendary ending
