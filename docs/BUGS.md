# Bug Tracker

Bugs from playtest feedback and other sources. Track status and cross off as fixed.

**Source:** `cursor-playtest-feedback.md` — first playthrough with v1 features (Jan 26, 2026).

---

## Active Bugs

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

## Fixed Bugs

### BUG-1 (fixed)
- **Fixed:** Player screen overlays removed. PlayPage shows full-screen scene image only during gameplay; results and turn indicators removed.

### BUG-2 (fixed)
- **Fixed:** Batched reveal removed. DM shows outcomes progressively as each choice is submitted; no "Reveal Results" step. When all acted, scene outcome + Next Scene / End Adventure shown immediately.

### BUG-3 (fixed)
- **Fixed:** Addressed via BUG-2 — no "waiting for reveal" state.

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
