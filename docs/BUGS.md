# Bug Tracker

Bugs from playtest feedback and other sources. Track status and cross off as fixed.

**Source:** `cursor-playtest-feedback.md` — first playthrough with v1 features (Jan 26, 2026).

---

## Active Bugs

### BUG-5: Kids get bored waiting for 3rd player's turn
- **Description:** Progressive reveal (vs batched) helped, but by the time the 3rd kid takes their turn, the other kids are disengaged. Need to think about how to keep everyone engaged while others play, or make action results engaging for everyone watching.
- **Severity:** Medium
- **Status:** Open (needs design thinking)
- **Affects:** Core turn-based gameplay loop
- **Source:** Playtest with 3yo, 5yo, 7yo (Jan 27, 2026)
- **Ideas to explore:**
  - Cooperative moments where all kids contribute?
  - Mini-engagement for watchers (predict outcome, cheer, etc.)?
  - Shorter turns / simultaneous actions?
  - Visual spectacle that's fun to watch even when not your turn?
  - Role for "audience" kids during each turn?
- **Notes:** Needs design session to think through

- [ ] **Fixed**

---

### BUG-4: Reward popup feels like a system alert, not a celebration
- **Description:** The reward display on the player screen looks too much like a system interruption dialog. Kids immediately clicked it to dismiss rather than celebrating. Should feel like "amazing reward I should care about" not "system alert getting in the way."
- **Severity:** Medium
- **Status:** Fixed
- **Affects:** [RewardCelebration](src/components/RewardCelebration.tsx)
- **Source:** Playtest with 3yo, 5yo, 7yo (Jan 27, 2026)
- **Fix:** Redesigned as game-style treasure chest reveal: animated chest bounces in and opens, rewards burst out with staggered timing, "You found X treasures!" announcement, enhanced confetti (larger shapes, rotation), sparkle effects, tap-anywhere dismiss after 2s delay. Modal/dialog styling completely removed.

- [x] **Fixed**

---

### BUG-1: Player screen overlays obscure scene image
- **Description:** Results overlay and turn indicators cover/compete with the full-screen scene illustration. Boxes and text distract kids; parent reported rushing past results to get back to the image.
- **Severity:** High
- **Status:** Fixed
- **Affects:** [PlayPage](src/pages/PlayPage.tsx) — overlay (results, "whose turn", status bar) over scene
- **Fix:** PlayPage during gameplay now shows full-screen scene image only. No overlays. Results/turns live on DM only.

- [x] **Fixed**

---

### BUG-2: Batched reveal creates gap; kids lose connection to choices
- **Description:** All choices/rolls are collected, then results revealed together. By the time results appear, kids have lost the thread of what they chose. Creates restlessness during others' turns and disconnect at reveal.
- **Severity:** High
- **Status:** Fixed
- **Affects:** DM flow (collect all → reveal); [gameState](src/lib/gameState.ts) `revealSceneResults`; PlayPage results display
- **Fix:** Outcomes shown progressively on DM as each choice is submitted. "Reveal Results" step removed. When all have acted, scene outcome + "Next Scene" / "End Adventure" shown immediately.

- [x] **Fixed**

---

### BUG-3: "All characters acted" / "Waiting for reveal" adds restlessness
- **Description:** Kids get restless waiting for others' turns. The explicit "All characters have acted!" plus "Waiting for DM to reveal..." extends the gap before any feedback.
- **Severity:** Medium
- **Status:** Fixed
- **Affects:** PlayPage waiting state; DM "Reveal Results" step
- **Fix:** Addressed by BUG-2. Reveal step removed; no "waiting for reveal" state.

- [x] **Fixed**

---

---

### BUG-9: Digital dice not showing for narrative turns (alwaysSucceed, no choices)
- **Description:** In digital dice mode, the player's dice roller doesn't appear for `alwaysSucceed` turns with `choices: null` (used in solo adventures like Sparkle & The Lost Star). DM shows "Waiting for player to tap dice..." but player screen has no dice. The `pending_choice_id` gating mechanism was only wired into the standard choice-button path.
- **Severity:** Critical (blocks solo adventure gameplay in digital mode)
- **Status:** Fixed
- **Affects:** DMPage.tsx (narrative turn path), PlayPage.tsx (dice visibility)
- **Fix:** Added useEffects to auto-set `pending_choice_id = 'narrative-roll'` for narrative turns, auto-submit when player roll arrives, and added cutscene handling to `handleSubmitNarrativeTurnDigital`.

- [x] **Fixed**

---

### BUG-10: Digital dice not showing for climax scenes
- **Description:** In digital dice mode, climax scenes (`isClimax: true`) show "Waiting for player to roll a 6..." but the player dice never appears. Since climax `alwaysSucceed` turns hardcode max roll and threshold 1, waiting for a player roll is unnecessary.
- **Severity:** Critical (blocks climax progression in digital mode)
- **Status:** Fixed
- **Affects:** DMPage.tsx (climax render path)
- **Fix:** Changed climax digital UI to show the GO button directly instead of waiting for `pending_player_roll`. DM reads the prompt, presses GO, auto-submits with max roll.

- [x] **Fixed**

---

### BUG-8: Reward celebration hidden behind cutscene overlay
- **Description:** The ending reward celebration (treasure chest animation) never appears on the player screen. Both RewardCelebration and CutsceneOverlay render at z-50; the cutscene covers the celebration while its 6-second auto-dismiss timer expires.
- **Severity:** High
- **Status:** Fixed
- **Affects:** PlayPage.tsx, RewardCelebration.tsx, CutsceneOverlay.tsx
- **Fix:** Gate `showSceneCelebration` and `showEndingCelebration` on `!session?.active_cutscene` so celebration waits until cutscene is dismissed.

- [x] **Fixed**

---

### BUG-7: Player screen shows no adventure previews after joining
- **Description:** After entering room code, player screen shows "Pick an adventure!" but the grid is empty. Family-exclusive adventures filtered out because `getAdventureList()` was called without `familySlug`.
- **Severity:** High
- **Status:** Fixed
- **Affects:** PlayPage.tsx
- **Fix:** Pass `session?.family_slug` to `getAdventureList()`.

- [x] **Fixed**

---

## Fixed Bugs

### BUG-1 (fixed)
- **Fixed:** Player screen overlays removed. PlayPage shows full-screen scene image only during gameplay; results and turn indicators removed.

### BUG-2 (fixed)
- **Fixed:** Batched reveal removed. DM shows outcomes progressively as each choice is submitted; no "Reveal Results" step. When all acted, scene outcome + Next Scene / End Adventure shown immediately.

### BUG-3 (fixed)
- **Fixed:** Addressed via BUG-2 — no "waiting for reveal" state.

### BUG-4 (fixed)
- **Fixed:** Redesigned RewardCelebration as game-style treasure chest reveal. Features: animated chest entrance with bounce, lid opens with wobble, rewards burst out with stagger, "You found X treasures!" pop-in text, enhanced confetti (larger varied shapes with rotation), sparkle effects. Tap-anywhere dismiss after 2s delay, auto-dismiss at 6s. Modal/button styling completely removed.

---

## Bug Report Template

```markdown
### BUG-XX: [Title]
- **Description:** 
- **Severity:** Critical | High | Medium | Low
- **Status:** Open | In Progress | Fixed
- **Affects:** 
- **Fix:** 

- [ ] **Fixed**
```
