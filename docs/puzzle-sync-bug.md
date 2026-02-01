# Puzzle Sync Bug - Player Screen Not Updating

## Problem Summary

Puzzle scenes (Seeker's Lens and Memory Match) do not appear on the PlayPage (player screen) after scene transitions during live gameplay. However, the puzzles DO appear correctly if the player does a hard browser refresh and recovers the session.

## Expected Flow

1. Scene 1 ends, cutscene appears on both screens
2. DM dismisses cutscene on DMPage
3. DM clicks "Next Scene" to go to Scene 2 (puzzle scene)
4. DM clicks "Start Challenge" button
5. PlayPage should show the puzzle overlay (SeekerLensPuzzle or MemoryPuzzle component)

## Actual Behavior

- Steps 1-4 work correctly on DMPage
- PlayPage does NOT show the puzzle after step 4
- If player refreshes browser and recovers session, puzzle DOES appear
- This confirms the database state IS correct (`puzzle_started: true`)

## Technical Details

### PlayPage Puzzle Rendering Condition (PlayPage.tsx ~line 483-500)

```typescript
{isPuzzleScene(currentScene) && isSeekerLensPuzzle(currentScene) &&
 session.puzzle_started && !session.puzzle_completed && (() => {
  // ... render SeekerLensPuzzle
})()}
```

The puzzle only renders when:
- `currentScene` is detected as a puzzle scene
- `session.puzzle_started` is truthy
- `session.puzzle_completed` is falsy

### Session Update Mechanisms

PlayPage has THREE ways to receive session updates:

1. **Supabase Realtime Subscription** (useSessionSubscription hook)
   - Listens for `postgres_changes` on the sessions table
   - Calls `onSessionUpdate(newSession)` when changes detected

2. **Heartbeat Polling** (useSessionSubscription hook)
   - Every 2 seconds, refetches session from database
   - Uses Zod validation before updating state

3. **Direct Polling** (added as debugging attempt)
   - Every 1 second, directly queries database
   - Bypasses subscription and validation
   - Sets state with `setSession(data as GameSession)`

### PlayPage handleSessionUpdate (PlayPage.tsx ~line 63-65)

```typescript
const handleSessionUpdate = useCallback((newSession: GameSession) => {
  setSession(newSession);
}, []);
```

This is a simple state setter with no filtering or protection.

## What We've Tried

### 1. Fixed Zod Schema (schemas/game.ts)
Added missing puzzle fields that were being stripped during validation:
```typescript
puzzle_started: z.boolean().nullable().optional(),
puzzle_completed: z.boolean().nullable().optional(),
puzzle_outcome: z.enum(['success', 'fail']).nullable().optional(),
```
**Result**: Did not fix the issue

### 2. Added Race Condition Protection in startSceneById (gameState.ts)
Clear `active_cutscene: null` when starting a new scene to prevent stale cutscene data:
```typescript
await supabase.from('sessions').update({
  // ... other fields
  active_cutscene: null,
  puzzle_started: null,
  puzzle_completed: null,
  puzzle_outcome: null,
})
```
**Result**: Did not fix the issue

### 3. Increased Heartbeat Frequency (useSessionSubscription.ts)
Changed from 2 minutes to 2 seconds:
```typescript
const HEARTBEAT_INTERVAL_MS = 2 * 1000;
```
**Result**: Did not fix the issue

### 4. Added Direct Polling to PlayPage
Bypasses subscription entirely, queries database every 1 second:
```typescript
useEffect(() => {
  if (!session?.id) return;
  const pollSession = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session.id)
      .single();
    if (data) {
      setSession(data as GameSession);
    }
  };
  pollSession(); // Run immediately
  const interval = setInterval(pollSession, 1000);
  return () => clearInterval(interval);
}, [session?.id]);
```
**Result**: Did not fix the issue

### 5. Removed Auto-Advance from Cutscene Dismissal
Simplified `handleDismissCutscene` to only dismiss cutscene, requiring manual "Next Scene" click:
**Result**: Did not fix the issue

### 6. Added Puzzle State Protection in DMPage handleSessionUpdate
Prevent subscription from overwriting local puzzle state:
```typescript
if (prev?.puzzle_started && !prev?.puzzle_completed && newSession.puzzle_completed) {
  return { ...newSession, puzzle_completed: prev.puzzle_completed, puzzle_outcome: prev.puzzle_outcome };
}
```
**Result**: Did not fix the issue (this was for DMPage, not PlayPage)

## Key Observations

1. **Hard refresh works** - Database state is correct
2. **1-second direct polling doesn't work** - Even aggressive polling isn't updating the UI
3. **DMPage receives updates correctly** - Only PlayPage has the issue

## Theories

1. **React not re-rendering**: State might be updating but component not re-rendering
2. **currentScene derivation issue**: `currentScene` is computed from `session` and `adventure`, maybe stale closure
3. **Conditional rendering bug**: Something in the render conditions is preventing display
4. **Session ID changing**: The polling effect depends on `session?.id`, maybe session object is being replaced in a way that breaks the effect

## Files Involved

- `src/pages/PlayPage.tsx` - Player screen, puzzle rendering
- `src/pages/DMPage.tsx` - DM screen, puzzle controls
- `src/hooks/useSessionSubscription.ts` - Realtime subscription + heartbeat
- `src/lib/gameState.ts` - Database operations including `startPuzzle()`
- `src/schemas/game.ts` - Zod schemas for validation
- `src/lib/adventures.ts` - `isPuzzleScene()`, `isSeekerLensPuzzle()`, etc.
