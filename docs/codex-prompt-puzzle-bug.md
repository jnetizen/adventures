# Codex CLI Prompt - Fix Puzzle Sync Bug

## The Bug

In this React + Supabase game app, puzzle scenes don't appear on the player screen (PlayPage.tsx) after scene transitions during live gameplay. The puzzles DO appear after a hard browser refresh.

## Context

Read `docs/puzzle-sync-bug.md` for full details on what's been tried.

## Your Task

1. **Investigate why PlayPage isn't re-rendering** when `session.puzzle_started` changes from `null` to `true`.

2. **Check the data flow**:
   - `src/pages/PlayPage.tsx` - lines 63-65 define `handleSessionUpdate`
   - `src/pages/PlayPage.tsx` - lines 71-77 use `useSessionSubscription` hook
   - `src/pages/PlayPage.tsx` - lines 80-100 have direct polling that was added for debugging
   - The puzzle rendering is around lines 483-520

3. **Key question**: Why does direct 1-second polling to the database NOT update the puzzle display, but a hard refresh DOES work?

4. **Possible causes to investigate**:
   - Is `currentScene` (a computed value derived from `session` and `adventure`) updating when `session` updates?
   - Is there a stale closure in the polling effect?
   - Is `isPuzzleScene(currentScene)` or `isSeekerLensPuzzle(currentScene)` returning false?
   - Is React's reconciliation somehow not detecting state changes?

5. **Add temporary debugging** if needed:
   - Add a `useEffect` that logs whenever `session.puzzle_started` changes
   - Add a `useEffect` that logs the result of `isPuzzleScene(currentScene)` and puzzle type checks
   - Check if `currentScene` changes when `session` changes

6. **Fix the issue** so puzzles appear on PlayPage immediately when the DM clicks "Start Challenge", without requiring a browser refresh.

## Files to Focus On

- `src/pages/PlayPage.tsx` (primary)
- `src/lib/adventures.ts` (puzzle detection functions)
- `src/hooks/useSessionSubscription.ts` (subscription logic)

## Testing

After your fix:
1. Start the app with `npm run dev`
2. Open DMPage on one browser, PlayPage on another
3. Go through Scene 1, dismiss cutscene
4. Click "Next Scene" to go to Scene 2 (puzzle scene)
5. Click "Start Challenge" on DMPage
6. PlayPage should immediately show the SeekerLensPuzzle component

## Constraints

- Don't add console.log statements that the user has to check - they've asked not to do that
- The fix should work without requiring a browser refresh
- Keep changes minimal - fix the root cause, don't add workarounds
