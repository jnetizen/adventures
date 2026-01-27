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
