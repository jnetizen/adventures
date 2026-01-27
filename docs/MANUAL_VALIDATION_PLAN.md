# Manual Validation Plan

A runnable checklist for systematically testing the Adventures app end-to-end. Use this during manual testing sessions to validate all features and flows.

**Quick Links:**
- **Feedback questions and session template** → [TESTING.md](TESTING.md)
- **Bug reporting** → [BUGS.md](BUGS.md)
- **Quick reference** → [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## 1. Pre-Test Setup

- [ ] `npm run dev` running; both DM and Player use same origin (e.g. `localhost:5173`)
- [ ] Two devices or two browser windows (one DM, one Player)
- [ ] Supabase env vars set; migrations applied (`npm run db:migrate`)
- [ ] Optional: DevTools → Network → "Offline" available for offline tests

---

## 2. Setup and Joining

- [ ] **Landing** – [LandingPage](src/pages/LandingPage.tsx): "Start as DM" → `/dm`, "Join as Player" → `/play`
- [ ] **Create session** – DM: create session → room code appears
- [ ] **Join** – Player: enter room code → join success; ConnectionStatus "Connected" on both
- [ ] **Invalid code** – Wrong code → clear error (no crash)
- [ ] **Empty code** – Join with empty code → handled gracefully

---

## 3. Adventure Selection and Prologue

- [ ] **Adventure list** – DM sees [AdventureSelectPage](src/pages/AdventureSelectPage.tsx) with Candy Volcano and Dragon Knight Rescue (preview, tagline, themes, time)
- [ ] **Select adventure** – Pick one → loads; no errors
- [ ] **Character assignment** – Enter 1–3 kid names; assign each to a character; character cards show image/name/intro
- [ ] **Prologue** – [ProloguePage](src/pages/ProloguePage.tsx): world intro, character intros, mission brief; "Start Adventure" → Scene 1

---

## 4. Scene Play (DM)

- [ ] **Narration** – Scene text and choices for current character turn
- [ ] **Dice** – Manual input works; [DiceRoller](src/components/DiceRoller.tsx) rolls 1–20, fills input, result shown
- [ ] **Choices** – Select choice, enter/roll dice, submit; next character turn
- [ ] **Progressive outcomes** – No "Reveal Results" step; outcome appears per choice on DM; when all acted, scene outcome + "Next Scene" or "End Adventure" shown
- [ ] **Success count** – Shown on DM; increments when roll ≥ threshold; persists across scenes

---

## 5. Scene Play (Player)

- [ ] **Full-screen scene** – [PlayPage](src/pages/PlayPage.tsx) shows only scene image during play; no overlays, no "whose turn" or results on player screen
- [ ] **Scene changes** – New scene → new image when DM advances

---

## 6. Rewards and Progression

- [ ] **Scene rewards** – When a scene has rewards and all have acted, [RewardCelebration](src/components/RewardCelebration.tsx) (scene variant) appears on **both** DM and Player; confetti-style UI; can dismiss; no duplicate for same scene
- [ ] **Next scene** – "Next Scene" → DM and Player advance; success count unchanged
- [ ] **Ending rewards** – On final scene, after all acted, ending celebration (ending variant) if ending has rewards; then [EndingPage](src/pages/EndingPage.tsx)

---

## 7. Ending and Feedback

- [ ] **Tiered ending** – Ending matches success count: good (0–7), great (8–11), legendary (12+); title, narration, rewards on both screens
- [ ] **End Adventure** – "End Adventure" → feedback form (rating, optional positive/negative/notes)
- [ ] **Submit feedback** – Submit → form closes; session reset for new adventure
- [ ] **Reset** – DM can start new adventure (adventure select, etc.); success count and previous adventure state cleared

---

## 8. Error Recovery

- [ ] **Session persistence** – Play partially; refresh DM or Player → "Recover Session" offered when a stored session exists
- [ ] **Recover** – Click "Recover Session" → rejoin same session; state consistent
- [ ] **Errors** – Trigger failure (e.g. bad network): messages are user-friendly (no raw stack traces)

---

## 9. Offline Mode

- [ ] **Offline** – DM or Player goes offline (e.g. DevTools Network offline); [ConnectionStatus](src/components/ConnectionStatus.tsx) shows "Offline"
- [ ] **Play offline** – Create session / join / make choices offline; actions queue; no crash
- [ ] **Back online** – Restore network; status → "Syncing" then "Connected"; pending ops synced; no duplicate or lost critical updates

---

## 10. Edge Cases

- [ ] **Single player** – One kid, one character; full flow works
- [ ] **Three players** – Three kids, three characters; turns and rewards correct
- [ ] **Browser refresh** – Refresh DM mid-scene; recover and continue (or clear flow)
- [ ] **Low vs high success** – Deliberately fail/succeed rolls; verify good vs legendary ending

---

## Notes Section

Use this space to capture observations, issues, or feedback during testing:

### Issues Found
- 

### Positive Observations
- 

### Questions or Ambiguities
- 

---

## Next Steps After Testing

1. **Report bugs** → Add to [BUGS.md](BUGS.md) using the bug report template
2. **Capture feedback** → Use [TESTING.md](TESTING.md) feedback questions and session template
3. **Document findings** → Update [USER_RESEARCH.md](USER_RESEARCH.md) with test session notes
4. **Prioritize fixes** → Review bugs and plan fixes based on severity
