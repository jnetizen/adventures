# Debugging Learnings & Common Issues

This document captures lessons learned from debugging the Adventures app, to help fix similar issues faster in the future.

---

## 1. Cutscene Timing / Race Conditions

### Problem
Cutscenes weren't appearing after submitting character choices. The dismiss button would not show, or cutscenes would appear at wrong times.

### Root Cause
Race condition between:
1. `submitCharacterChoice` updating the database (advances turn index)
2. Supabase subscription delivering that update (with `active_cutscene: null`)
3. `showCutscene` updating the database (sets `active_cutscene`)
4. Optimistic UI update getting overwritten by stale subscription data

### Solution
1. **Set optimistic update BEFORE async calls:**
   ```tsx
   // WRONG - optimistic update after async
   await showOutcomeCutscene(session.id, turn.characterId, turnOutcome);
   setSession((prev) => prev ? { ...prev, active_cutscene: cutsceneData } : null);

   // CORRECT - optimistic update before async
   setSession((prev) => prev ? { ...prev, active_cutscene: cutsceneData } : null);
   await showOutcomeCutscene(session.id, turn.characterId, turnOutcome);
   ```

2. **Preserve local state in subscription handler:**
   ```tsx
   const handleSessionUpdate = useCallback((newSession: GameSession) => {
     setSession((prev) => {
       // Preserve optimistic active_cutscene if incoming update doesn't have it
       if (prev?.active_cutscene && !newSession.active_cutscene) {
         return { ...newSession, active_cutscene: prev.active_cutscene };
       }
       return newSession;
     });
   }, []);
   ```

### Key Files
- `src/pages/DMPage.tsx` - handleSubmitChoice, handleSessionUpdate
- `src/lib/gameState.ts` - showCutscene, dismissCutscene

---

## 2. Video Autoplay Issues

### Problem
Climax video wasn't playing on the player screen.

### Root Cause
Browsers block autoplay of videos with sound. The video element had `muted={false}`.

### Solution
```tsx
// WRONG - blocks autoplay
<video autoPlay muted={false} />

// CORRECT - allows autoplay, add controls for user to unmute
<video autoPlay muted controls playsInline />
```

### Key Files
- `src/components/CutsceneOverlay.tsx`

---

## 3. React Hooks Ordering

### Problem
App behaving unexpectedly after adding new state variables.

### Root Cause
React hooks must be called in the same order on every render. Placing `useState` in the middle of component (between functions) can cause issues.

### Solution
Always declare all `useState` hooks at the top of the component, before any other logic:
```tsx
export default function MyComponent() {
  // ALL useState declarations first
  const [state1, setState1] = useState(null);
  const [state2, setState2] = useState(0);
  const [state3, setState3] = useState(false);

  // Then hooks that depend on state
  useEffect(() => { ... }, [state1]);

  // Then handler functions
  const handleClick = async () => { ... };

  // Then render
  return <div>...</div>;
}
```

### Key Files
- Any React component

---

## 4. Adventure JSON Structure

### Scene Numbers Must Start from 0
The app looks for `sceneNumber: 0` on initialization. If scenes start from 1, the app crashes.

```json
// WRONG
{ "id": "scene-1", "sceneNumber": 1 }

// CORRECT
{ "id": "scene-1", "sceneNumber": 0 }
```

### Character IDs Must Match
Character IDs in `characters` array must match IDs used in:
- `characterTurns[].characterId`
- `prologue.characterIntros[].characterId`
- `outcome.nextSceneId` (for branching)
- Cutscene image filenames

### Required Fields for Cutscenes
For per-turn cutscenes to work, turns need:
```json
{
  "characterId": "flame-striker",
  "successThreshold": 10,
  "successOutcome": {
    "text": "Success message",
    "cutsceneImageUrl": "/images/cutscenes/adventure/scene1-flame-striker-success.png"
  },
  "failOutcome": {
    "text": "Fail message",
    "cutsceneImageUrl": "/images/cutscenes/adventure/scene1-flame-striker-fail.png"
  }
}
```

### Climax Scene Requirements
```json
{
  "id": "scene-4",
  "isClimax": true,
  "climaxVideoUrl": "/images/cutscenes/adventure/climax-video.mp4",
  "characterTurns": [
    {
      "characterId": "flame-striker",
      "alwaysSucceed": true,
      "outcome": {
        "text": "Climax action text",
        "cutsceneImageUrl": "/images/cutscenes/adventure/scene4-flame-striker.png"
      }
    }
  ]
}
```

### Key Files
- `src/data/adventures/*.json`
- `src/types/adventure.ts` - Type definitions

---

## 5. File Path & Naming Conventions

### Image/Video Paths
- Files go in: `public/images/...`
- JSON references: `/images/...` (no `public` prefix)
- Example: File at `public/images/cutscenes/shadow-knight/scene1.png` → JSON uses `/images/cutscenes/shadow-knight/scene1.png`

### Cutscene Naming Convention
```
scene{N}-{character-id}-{success|fail}.png
```
Examples:
- `scene1-flame-striker-success.png`
- `scene1-flame-striker-fail.png`
- `scene2a-shadow-ranger-success.png`

### Git LFS for Large Files
Images and videos are stored in Git LFS. After cloning:
```bash
git lfs pull
```

If images show as placeholder text, run `git lfs pull`.

---

## 6. Image Generation Prompts

### Physical Characteristics Are Required
Every image prompt **must** include the physical characteristics of each character to ensure consistent generation across all images. Without these, the AI will generate different-looking characters in each image.

### Required Character Details
For each character in a prompt, specify:
- **Age** (e.g., "8-year-old", "young child around 6")
- **Hair color and style** (e.g., "curly red hair", "short black hair")
- **Skin tone** (e.g., "light skin", "brown skin", "dark skin")
- **Build** (if relevant)

### Example
```
// BAD - inconsistent characters across images
"a child wearing ORANGE armor with GOLD accents"

// GOOD - consistent character across all images
"an 8-year-old girl with curly red hair and freckles, light skin, wearing ORANGE armor with GOLD accents"
```

### Character Description Block
Create a reusable character description for your prompts manifest:
```json
{
  "characterDescriptions": {
    "sun-flare": "an 8-year-old girl with curly red hair, freckles, and light skin",
    "sky-stalker": "a 10-year-old boy with short black hair and brown skin",
    "cloud-dancer": "a 6-year-old girl with long blonde hair in pigtails and light skin"
  }
}
```

Then reference these in every prompt to ensure consistency.

### Key Files
- `docs/*-image-prompts.json` - Image generation manifests

### Model Consistency
**Always use the same model for ALL images in an adventure.** Switching models mid-generation creates visual style inconsistencies.

- Decide on the model BEFORE generating any images
- If quality is unsatisfactory, regenerate ALL images with the new model
- Current recommended model for FREE tier: `gemini-2.0-flash-exp-image-generation`
- `gemini-2.5-flash-image` is PAID TIER ONLY (verified Jan 2026)
- Do NOT mix models in the same adventure

### Generation Workflow
1. Do a dry run first: `--dry-run`
2. Generate ONE test image to check quality
3. If quality is good, generate remaining images
4. If quality is bad, switch models and start over (don't mix)

---

## 7. Environment Variables

### Required Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Checking for Missing Variables
If the app shows a blank page, check browser console for Supabase errors.

---

## 8. Parallel/Branching Scenes

### Structure
```json
{
  "outcome": {
    "nextSceneId": {
      "shadow-ranger": "scene-2a",
      "flame-striker": "scene-2b",
      "sparkle-rider": "scene-2b"
    }
  }
}
```

### Parallel Scene Flags
```json
{
  "id": "scene-2a",
  "isParallelScene": true,
  "parallelWith": "scene-2b",
  "activeCharacters": ["shadow-ranger"]
}
```

### Key State
- `session.is_split` - Whether party is currently split
- `session.character_scenes` - Per-character scene tracking during split

---

## 9. Debugging Tools

### Console Log Colors
The codebase uses colored console logs for debugging:
- **Blue** `[CUTSCENE] Step 1` - Checking turn for cutscene
- **Green** `[CUTSCENE] Step 2` - Outcome resolved
- **Orange** `[CUTSCENE] Step 3` - Setting cutscene
- **Cyan** `[SUBSCRIPTION]` - Subscription updates
- **Yellow** `[SUBSCRIPTION] Preserving` - Race condition prevented
- **Lime** `[DISMISS] Cutscene IS active` - Dismiss button should show
- **Lime** `[CLIMAX]` - Climax flow debugging

### Adding Debug Logs
```tsx
console.log('%c[LABEL] Message', 'color: lime; font-weight: bold', data);
```

### Checking Video Loading
```tsx
onLoadedData={() => console.log('[VIDEO] Loaded:', imageUrl)}
onError={(e) => console.error('[VIDEO] Error:', imageUrl, e)}
onPlay={() => console.log('[VIDEO] Playing')}
```

---

## 10. Common Gotchas

1. **Subscription overwrites optimistic updates** - Only preserve local state in DMPage (initiator), not PlayPage (receiver)

2. **Video autoplay blocked** - Must be muted for autoplay to work

3. **Scene numbers start at 0** - Not 1

4. **Character IDs must be consistent** - Across JSON, file names, and code

5. **Git LFS files appear as text** - Run `git lfs pull`

6. **TypeScript errors from JSON** - Cast imports: `import data from './file.json'` then use `data as Adventure`

7. **Hooks must be in same order** - Declare all `useState` at top of component

8. **Async timing in React** - State updates from `setSession` don't take effect immediately; use functional updates: `setSession((prev) => ...)`

9. **JSON field names must match TypeScript types exactly** - If a type requires `narrationText`, using `text` in JSON will cause a build error. Always check `src/types/adventure.ts` for exact field names.

10. **Reset state when advancing scenes** - Call `resetPuzzleState()` and any other state reset functions when moving to next scene

11. **Use session?.id in useEffect deps, not session** - Objects trigger reruns on every change; IDs only when actually changed

12. **iOS permissions need user gesture** - DeviceOrientationEvent.requestPermission() must be called from click/tap handler, not on mount

13. **Camera facingMode matters** - Use 'environment' for back camera (room search), 'user' for front camera (selfie)

14. **Format errors handle PostgrestError** - Supabase errors are `{ message: string }`, not `Error` instances

---

## 11. JSON Field Naming Must Match TypeScript Types

### Problem
Build fails with TypeScript error like:
```
error TS2352: Conversion of type '...' to type 'Adventure' may be a mistake
Property 'narrationText' is missing in type '{ title: string; text: string; }' but required in type 'SingleEnding'.
```

### Root Cause
Adventure JSON files are cast to TypeScript types (`as Adventure`). If the JSON uses a different field name than the type expects, the build fails.

### Example
```json
// WRONG - uses 'text' but type requires 'narrationText'
"ending": {
  "title": "The End",
  "text": "The heroes saved the day..."
}

// CORRECT - matches SingleEnding type
"ending": {
  "title": "The End",
  "narrationText": "The heroes saved the day..."
}
```

### How to Fix
1. Check `src/types/adventure.ts` for the exact field names required
2. Update the JSON to use the correct field name
3. Run `npm run build` to verify

### Key Files
- `src/types/adventure.ts` - Type definitions (source of truth)
- `src/data/adventures/*.json` - Adventure data files

---

## 12. Cutscene Not Triggering (Intermittent)

### Problem
Cutscenes sometimes don't appear after submitting a character choice, particularly on the second or third character's turn.

### Potential Root Causes

1. **Double-click race condition** - User clicks submit button twice quickly before React's batched state updates disable the button. The second click runs with the wrong turn data.

2. **Subscription race condition** - After `submitCharacterChoice` updates the DB, the subscription might fire and update local state before the cutscene is set.

3. **Stale turn data** - The `currentCharacterTurn` might be captured after a subscription update has already advanced the turn index.

### Solution
Added ref-based guard to prevent double submissions:
```tsx
const submittingRef = useRef(false);

const handleSubmitChoice = async () => {
  // Refs update immediately, unlike state which batches
  if (submittingRef.current) {
    console.log('[SUBMIT] Blocked - already submitting');
    return;
  }
  submittingRef.current = true;

  // ... rest of function ...

  submittingRef.current = false; // Reset at all exit points
};
```

### Debug Logging
The code now logs detailed turn data on submit:
- `[SUBMIT] Turn data captured` - Shows captured turn's characterId, outcome URLs
- `[CUTSCENE] Step 1-5` - Traces the cutscene flow
- `[SUBMIT] Blocked` - Indicates double-click was prevented

### Status: FIXED
The ref-based guard resolved the intermittent cutscene issue. The root cause was likely a double-click race condition.

### If Bug Recurs
Check browser console for:
1. Is `[SUBMIT] Blocked` appearing? (double-click detected)
2. Does `[SUBMIT] Turn data captured` show correct characterId?
3. Are `successCutsceneUrl` and `failCutsceneUrl` populated?
4. Does `[CUTSCENE] Turn does not have per-turn outcomes` appear?

### Key Files
- `src/pages/DMPage.tsx` - handleSubmitChoice function

---

## 13. Session Timeout / "No Saved Session Found"

### Problem
After leaving the game idle for a few minutes, the session "expires" and clicking "Recover Session" shows "No saved session found".

### Root Causes

1. **Aggressive localStorage clearing** - The `useSessionPersistence` hook was clearing localStorage whenever session state became null, even temporarily.

2. **No heartbeat/keepalive** - Supabase realtime subscriptions can time out after inactivity, and the code wasn't proactively keeping the connection alive.

3. **Missing channel status handlers** - The subscription wasn't handling `TIMED_OUT` or `CLOSED` channel statuses.

### Solution

1. **Don't clear localStorage when session is null** (`useSessionPersistence.ts`):
   ```tsx
   // Only SAVE, don't clear on null
   if (session) {
     saveSessionToStorage(session);
   }
   // Removed: clearSessionFromStorage() when session is null
   ```

2. **Add heartbeat to keep connection alive** (`useSessionSubscription.ts`):
   ```tsx
   const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

   useEffect(() => {
     const heartbeat = setInterval(() => {
       refetchSession();
     }, HEARTBEAT_INTERVAL_MS);
     return () => clearInterval(heartbeat);
   }, [session, refetchSession]);
   ```

3. **Handle all channel statuses**:
   ```tsx
   if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
     refetchSession();
   } else if (status === 'CLOSED') {
     refetchSession();
   }
   ```

4. **Only clear localStorage on true "not found"** (`useSessionRecovery.ts`):
   ```tsx
   // Only clear if session truly doesn't exist, not on network errors
   if (errorMsg.includes('not found')) {
     clearSessionFromStorage();
   }
   ```

### Debug Logging
Console now logs:
- `[SUBSCRIPTION] Heartbeat - checking connection`
- `[SUBSCRIPTION] Channel status: <status>`
- `[RECOVERY] Attempting recovery, stored session: <code>`
- `[RECOVERY] Session recovered successfully`

### Key Files
- `src/hooks/useSessionPersistence.ts`
- `src/hooks/useSessionSubscription.ts`
- `src/hooks/useSessionRecovery.ts`

---

## 14. Google Gemini Free API for Image Generation

### ⚠️ CRITICAL FINDING: Free Tier API Image Generation Does NOT Work (Jan 2026)

Despite Google's pricing page claiming free tier availability, **API-based image generation returns `quota limit: 0` for ALL models on free tier projects**.

**What we tested:**
- Multiple free tier API keys from different projects
- Models: `gemini-2.0-flash-exp-image-generation`, `gemini-2.5-flash-image`, `gemini-2.0-flash`
- SDKs: `@google/generative-ai`, `@google/genai`
- All returned: `Quota exceeded for metric: generate_content_free_tier_requests, limit: 0`

**The confusion:**
- Google AI Studio **web UI** allows free image generation (manual, one at a time)
- Google AI Studio **API** has quota set to 0 for image generation on free tier
- The pricing page is misleading - "free tier" for images only applies to web UI, not API

### What Actually Works

**For FREE image generation:**
- Use Google AI Studio web UI manually: https://aistudio.google.com/
- Not automated, but genuinely free

**For API/automated image generation (PAID):**
- Requires billing enabled on your Google Cloud project
- Cheapest: Imagen 4 Fast at ~$0.02/image
- We use: `gemini-2.0-flash-exp-image-generation` with paid key

### Our Setup (Paid)

**API Key:**
- Paid key in `.env`: `GOOGLE_API_KEY=AIzaSyD4GRCw...`
- Uses $300 Google Cloud credit (not truly "free" but no out-of-pocket cost)

**Model:**
```typescript
model: 'gemini-2.0-flash-exp-image-generation'
```

**SDK Usage:**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp-image-generation',
  generationConfig: {
    responseModalities: ['image', 'text'],
  } as Record<string, unknown>,
});

const response = await model.generateContent(prompt);
// Extract image from response.response.candidates[0].content.parts
```

### API Keys We Have

| Key Prefix | Project Name | Status |
|------------|--------------|--------|
| `AIzaSyD4GRCw...` | (paid tier) | ✅ Works - uses $300 credit |
| `AIzaSyCaosfr...` | Quest-Family-Dev-Free | ❌ limit: 0 |
| `AIzaSyCN1mRC...` | Image Gen Key | ❌ limit: 0 |

### Rate Limiting (Paid Tier)
```typescript
const DELAY_BETWEEN_REQUESTS_MS = 3000; // 3 seconds between requests
```

### How to List Available Models
```bash
export $(grep -v '^#' .env | grep GOOGLE_API_KEY | xargs)
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY" | grep '"name"'
```

### Key Files
- `scripts/imageGenerationService.ts` - Main generation service
- `scripts/generateAdventureImages.ts` - Batch generation CLI
- `scripts/generateMissingRewards.ts` - Reward image generation

### Future TODO
- Revisit free tier periodically - Google may enable it later
- Consider alternative free image APIs (DALL-E free tier, Stability AI, etc.)

---

## 15. Puzzle State Not Resetting Between Scenes

### Problem
After completing a puzzle in Scene 2, moving to Scene 3 (which has a drag puzzle), the puzzle never appeared. The scene showed as already completed.

### Root Cause
`resetPuzzleState()` function existed in `gameState.ts` but was **never called** when advancing scenes. The puzzle state (`puzzle_started`, `puzzle_completed`, `puzzle_outcome`) persisted from the previous scene.

### Solution
Call `resetPuzzleState` when advancing to a new scene:

```tsx
// In handleNextScene or scene advancement logic
await resetPuzzleState(session.id);

// Also update local state to avoid waiting for subscription
setSession((prev) => prev ? {
  ...prev,
  puzzle_started: null,
  puzzle_completed: null,
  puzzle_outcome: null,
} : null);
```

### Key Files
- `src/lib/gameState.ts` - Contains resetPuzzleState function
- `src/pages/DMPage.tsx` - Must call it when advancing scenes

### Lesson
When adding new state that needs to be reset, search for all places that advance scenes and add the reset call.

---

## 16. PlayPage vs DMPage State Handling Differences

### Problem
Cutscenes were not dismissing on the player screen (PlayPage) even though they dismissed on the DM screen.

### Root Cause
PlayPage had **incorrect** cutscene preservation logic copied from DMPage:

```tsx
// WRONG for PlayPage - was preserving old cutscene state
const handleSessionUpdate = useCallback((newSession: GameSession) => {
  setSession((prev) => {
    if (prev?.active_cutscene && !newSession.active_cutscene) {
      return { ...newSession, active_cutscene: prev.active_cutscene };
    }
    return newSession;
  });
}, []);
```

DMPage needs to preserve cutscene state because it sets cutscenes optimistically before the database updates. PlayPage is a **passive receiver** and should always accept the database state.

### Solution
PlayPage should always accept incoming session state:

```tsx
// CORRECT for PlayPage - always accept database state
const handleSessionUpdate = useCallback((newSession: GameSession) => {
  setSession(newSession);
}, []);
```

### Key Principle
- **DMPage (initiator)**: May need to preserve optimistic state
- **PlayPage (receiver)**: Always accept incoming state from database

### Key Files
- `src/pages/PlayPage.tsx` - Must NOT preserve optimistic state
- `src/pages/DMPage.tsx` - May preserve optimistic state (cutscenes)

---

## 17. Subscription Dependency Array - Use session.id Not session

### Problem
Supabase realtime subscriptions were constantly recreating, causing repeated console logs and potential missed updates.

### Root Cause
Using `session` object in useEffect dependency array:

```tsx
// WRONG - recreates subscription on ANY session field change
useEffect(() => {
  if (!session?.id) return;
  const channel = supabase.channel(`session:${session.id}`)...
}, [session, ...]);  // ❌ session object changes on every update
```

### Solution
Extract and use only `session?.id`:

```tsx
// CORRECT - only recreates when session ID actually changes
const sessionId = session?.id;
useEffect(() => {
  if (!sessionId) return;
  const channel = supabase.channel(`session:${sessionId}`)...
}, [sessionId, ...]);  // ✅ stable reference
```

### Key Files
- `src/hooks/useSessionSubscription.ts`

### Lesson
In React dependency arrays, always use the most specific value needed, not entire objects.

---

## 18. iOS Permission Requirements (Camera/Motion Sensors)

### Problem
On iOS, clicking "Activate the Lens!" immediately showed "Camera or motion sensors not available" without prompting for permissions.

### Root Cause
iOS 13+ requires `DeviceOrientationEvent.requestPermission()` to be called from within a **direct user gesture** (click/tap handler). The original code tried to request permissions on component mount.

### Solution
1. Start with a "waiting" state showing a button
2. Only request permissions when user taps the button
3. The tap is the "user gesture" that iOS requires

```tsx
// State starts as 'waiting'
const [permissionStatus, setPermissionStatus] = useState<
  'waiting' | 'requesting' | 'granted' | 'denied' | 'unavailable'
>('waiting');

// Show button that triggers permission request
if (permissionStatus === 'waiting') {
  return (
    <button onClick={requestPermissions}>
      Activate the Lens!
    </button>
  );
}

// requestPermissions is called FROM the button click (user gesture)
const requestPermissions = useCallback(async () => {
  setPermissionStatus('requesting');

  // This now works because it's in a user gesture context
  const permission = await DeviceOrientationEvent.requestPermission();
  ...
}, []);
```

### Debug Logging Added
```tsx
console.log('[SeekerLens] === Starting permission request ===');
console.log('[SeekerLens] User agent:', navigator.userAgent);
console.log('[SeekerLens] DeviceOrientationEvent in window:', 'DeviceOrientationEvent' in window);
console.log('[SeekerLens] requestPermission function exists:', typeof ... === 'function');
```

### Key Files
- `src/components/SeekerLensPuzzle.tsx`

### Key Principle
iOS requires camera AND motion sensor permissions to be requested from user gestures. Don't auto-request on mount.

---

## 19. Camera facingMode for AR Puzzles

### Problem
The Seeker's Lens puzzle used the front-facing camera, showing the player's face instead of letting them "search the room."

### Root Cause
Default camera constraint was using front camera:
```tsx
video: { facingMode: 'user' }  // Front camera (selfie mode)
```

### Solution
Use environment-facing (back) camera for room search:
```tsx
video: { facingMode: 'environment' }  // Back camera
```

Also removed the mirror CSS transform that was for selfie mode:
```tsx
// Removed: style={{ transform: 'scaleX(-1)' }}
```

### Key Files
- `src/components/SeekerLensPuzzle.tsx`

---

## 20. formatError Showing "[object Object]"

### Problem
Clicking "Start Challenge" on DM screen showed error message: `[object Object]`

### Root Cause
`formatError()` function only handled `Error` instances and strings. Supabase returns `PostgrestError` objects which have a `message` property but aren't `Error` instances.

```tsx
// WRONG - doesn't handle PostgrestError
const message = err instanceof Error ? err.message : String(err);
// String({message: "foo"}) → "[object Object]"
```

### Solution
Check for objects with a `message` property:
```tsx
const message = err instanceof Error
  ? err.message
  : (typeof err === 'object' && err !== null && 'message' in err)
    ? (err as { message: string }).message
    : null;
```

### Key Files
- `src/lib/errorRecovery.ts`

### Lesson
When formatting errors, handle common error shapes: `Error`, `{ message: string }`, and strings.

---

## 21. Wake Lock API for Keeping Screen Awake

### Problem
iPad screen kept turning off during gameplay, requiring taps to wake it.

### Solution
Use the Wake Lock API to prevent screen from sleeping:

```tsx
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('[WakeLock] Failed to acquire:', err);
      }
    };

    requestWakeLock();

    // Re-acquire when page becomes visible (after screen lock/unlock)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      wakeLockRef.current?.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
```

### Usage
```tsx
// In PlayPage.tsx and DMPage.tsx
import { useWakeLock } from '../hooks';
useWakeLock();  // Just call the hook - no return value needed
```

### Key Files
- `src/hooks/useWakeLock.ts` (new file)
- `src/hooks/index.ts` - Export the hook
- `src/pages/PlayPage.tsx` - Uses the hook
- `src/pages/DMPage.tsx` - Uses the hook

### Notes
- Wake Lock is released automatically when page is hidden
- Must re-acquire when page becomes visible again
- Not all browsers support it, but fails gracefully

---

## 23. Vercel Deployment with Git LFS

### Problem
Images show as broken/placeholder on Vercel deployment, even though they work locally.

### Root Cause
Vercel's auto-deploy from Git does NOT pull Git LFS files. It only gets the pointer files, not the actual images.

### Solution
Always deploy using the Vercel CLI from your local machine:

```bash
vercel --prod --yes
```

The CLI uploads your local files directly (with LFS expanded), bypassing Git entirely.

**Do NOT rely on:**
- Auto-deploy from Git pushes
- Adding `git lfs pull` to build commands (Vercel build env has no Git repo)

### Workflow
1. Make changes locally
2. Commit and push to Git (for version control)
3. Deploy with `vercel --prod --yes` (for actual deployment)

### Key Files
- `vercel.json` - Vercel configuration
- `.gitattributes` - Git LFS tracking rules

---

## 24. Vercel SPA Routing (404 on Direct URLs)

### Problem
Navigating directly to `/dm` or `/play` shows "404: NOT_FOUND" on Vercel.

### Root Cause
Vercel looks for a file at that path instead of serving the React app.

### Solution
Add rewrites to `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This tells Vercel to serve `index.html` for all routes, letting React Router handle them.

### Key Files
- `vercel.json`

---

## 25. iOS Safari Black Camera Screen

### Problem
Camera permissions granted, but video feed shows black screen.

### Root Cause
Two issues combined:
1. iOS Safari doesn't always honor the `autoPlay` attribute
2. **React rendering order**: The video element only exists when `permissionStatus === 'granted'`, but we were trying to attach the stream BEFORE setting that state

### Solution
Set permission state FIRST, wait for React to render the video element, THEN attach stream:

```tsx
// 1. Set state FIRST so video element renders
setPermissionStatus('granted');

// 2. Wait for React to render the video element
await new Promise(resolve => setTimeout(resolve, 100));

// 3. NOW attach stream and play
if (videoRef.current) {
  videoRef.current.srcObject = stream;
  await videoRef.current.play();
}
```

**Wrong order (causes black screen):**
```tsx
// Video element doesn't exist yet!
videoRef.current.srcObject = stream;  // videoRef.current is null
setPermissionStatus('granted');        // NOW video renders, but stream not attached
```

### Key Insight
When a React ref points to a conditionally-rendered element, you must ensure the element is rendered BEFORE accessing the ref.

### Key Files
- `src/components/SeekerLensPuzzle.tsx`

---

## 26. HTTPS Required for Camera/Motion on iOS

### Problem
Camera and motion sensor permissions immediately denied on iOS, no prompt shown.

### Root Cause
iOS requires a "secure context" (HTTPS) for sensitive APIs. Local development over HTTP (like `http://192.168.x.x`) is not secure.

### Solution
Test on HTTPS:
- Deploy to Vercel and test on the `.vercel.app` URL
- Or use `ngrok` for local HTTPS tunneling

### Debug Log to Look For
```
Call to requestPermission() failed, reason: Browsing context is not secure.
```

### Key Files
- `src/components/SeekerLensPuzzle.tsx`

---

## 27. Supabase Error "cannot coerce to single json object"

### Problem
User sees confusing error: "cannot coerce the result to a single json object"

### Root Cause
Using `.single()` on a Supabase query that returns 0 rows (e.g., invalid room code).

### Solution
Handle the specific error code and return user-friendly message:

```tsx
if (error) {
  // PGRST116 = no rows returned
  if (error.code === 'PGRST116') {
    return { error: new Error('Room not found. Check the code and try again.') };
  }
  return { error: new Error(error.message || 'Something went wrong') };
}
```

### Key Files
- `src/lib/gameState.ts` - findSessionByCode function

---

## 28. Testing Checklist

Before playtesting a new adventure:

- [ ] All scene numbers start from 0
- [ ] All character IDs match across JSON
- [ ] All cutscene images exist at referenced paths
- [ ] Climax video exists (if using video mode)
- [ ] Run `git lfs pull` to get actual image/video files
- [ ] Check browser console for errors during playthrough
- [ ] Test both cutscenes mode and video mode for climax
- [ ] Test all character paths in parallel scenes

For puzzle adventures:
- [ ] Test puzzle state resets when advancing to next scene
- [ ] Test physical puzzles (DM controls work, player sees challenge)
- [ ] Test drag puzzles (symbols appear, ordering works)
- [ ] Test Seeker's Lens on iOS (permission prompt appears, camera activates)

For iOS/iPad testing:
- [ ] Permission dialogs appear for camera and motion sensors
- [ ] Screen stays awake during gameplay (wake lock active)
- [ ] Cutscenes sync properly between DM and player screens
- [ ] Session recovers after screen lock/unlock
- [ ] Test on HTTPS (Vercel URL), not localhost

For Vercel deployment:
- [ ] Deploy using `vercel --prod --yes` (not auto-deploy from Git)
- [ ] Verify images load on deployed site
- [ ] Test direct URL navigation (e.g., /dm, /play)

---

## 29. Scene Transition Race Condition with Cutscenes

### Problem
After dismissing a cutscene on scene 1 and auto-advancing to scene 2, the puzzle UI (e.g., Seeker's Lens) didn't appear. The "Start Challenge" button was missing.

### Root Cause
`startSceneById()` updated multiple session fields (scene, puzzle state, etc.) but did NOT clear `active_cutscene`. The flow was:

1. DM dismisses cutscene → `handleDismissCutscene()` called
2. `handleNextScene()` calls `startSceneById()` → updates DB (but `active_cutscene` still set)
3. Supabase subscription delivers update with new scene BUT old `active_cutscene`
4. THEN `dismissCutscene()` clears `active_cutscene` in a separate DB call
5. **Race condition**: The subscription update from step 3 arrives with `active_cutscene` still set
6. Puzzle UI condition `!session.active_cutscene` is false → button hidden

### Solution
Clear `active_cutscene` atomically with the scene transition in `startSceneById()`:

```typescript
// In gameState.ts - startSceneById()
.update({
  current_scene: sceneNumber,
  current_scene_id: sceneId,
  // ... other fields ...
  puzzle_started: null,
  puzzle_completed: null,
  puzzle_outcome: null,
  // Clear cutscene atomically to prevent race conditions
  active_cutscene: null,  // ← ADD THIS
  updated_at: new Date().toISOString(),
})
```

Also update the local state in DMPage:
```typescript
setSession((prev) => prev ? {
  ...prev,
  current_scene: nextSceneNumber,
  current_scene_id: nextSceneId,
  // ... other fields ...
  active_cutscene: null,  // ← ADD THIS
} : null);
```

### Key Insight
When multiple fields need to change together for correct UI state, update them in a **single database operation** to avoid subscription race conditions.

### Key Files
- `src/lib/gameState.ts` - `startSceneById()` function
- `src/pages/DMPage.tsx` - `handleNextScene()` local state update

---

## 30. Session Recovery Loading Wrong Adventure

### Problem
Player refreshed their screen mid-adventure and ended up on a completely different adventure (Dragon story instead of Shrine story).

### Root Cause
`localStorage` held a stale session from a previous game. When the player refreshed, the recovery mechanism loaded the old session data.

### Solution
Clear localStorage when creating or joining a new session:

```typescript
// In DMPage.tsx - when creating session
clearSessionFromStorage();
setSession(data);

// In PlayPage.tsx - when joining session
clearSessionFromStorage();
setSession(data);
```

This ensures that starting a new game always starts fresh, and only recovers sessions when the user explicitly chooses "Recover Session".

### Key Files
- `src/pages/DMPage.tsx` - Session creation
- `src/pages/PlayPage.tsx` - Session joining
- `src/lib/errorRecovery.ts` - `clearSessionFromStorage()`

---

## 31. Puzzle Success Overlay Showing Prematurely

### Problem
The green "Amazing! Challenge Complete!" success overlay was appearing even when the puzzle hadn't been started yet in the current scene.

### Root Cause
The success overlay condition only checked `puzzle_completed && puzzle_outcome === 'success'`. If puzzle state wasn't properly reset from a previous scene, the overlay would show immediately.

### Solution
Add `puzzle_started` to the condition:

```tsx
// Only show if puzzle was STARTED in this scene
{isPuzzleScene(currentScene) &&
 session.puzzle_started &&  // ← Must have started
 session.puzzle_completed &&
 session.puzzle_outcome === 'success' &&
 !session.active_cutscene && (
  <div className="...">Amazing! Challenge Complete!</div>
)}
```

### Key Files
- `src/pages/PlayPage.tsx` - Puzzle success overlay condition

---

## 32. Scene Outcome Showing Before Challenge Starts

### Problem
On puzzle scenes, the "Scene Outcome" section with "Next Scene" button was showing before the player completed the challenge.

### Root Cause
The scene outcome section checked `allActed` but didn't exclude puzzle scenes. Since puzzle scenes often have no character turns, `allActed` was true immediately.

### Solution
Add `!isPuzzleScene(currentScene)` to the condition:

```tsx
{currentScene && allActed && !showingEpilogue &&
 !(players.length === 1 && session.active_cutscene) &&
 !isPuzzleScene(currentScene) && (  // ← Exclude puzzle scenes
  <>
    {currentScene.outcome && renderSceneOutcome(currentScene.outcome)}
    {/* Next Scene button */}
  </>
)}
```

For puzzle scenes, the "Puzzle Completed" section handles the Next Scene button instead.

### Key Files
- `src/pages/DMPage.tsx` - Scene outcome section

---

## 33. Epilogue Cutscene Dismiss Loop

### Problem
When dismissing the epilogue cutscene, the game would loop back and show the epilogue again instead of completing.

### Root Cause
`handleDismissCutscene()` had logic for auto-advancing to next scene, which would call `handleNextScene()`. For the epilogue, this triggered `goToEpilogue()` again.

### Solution
Check if we're already showing the epilogue and complete the game instead:

```typescript
const handleDismissCutscene = async () => {
  // If we're already showing epilogue, dismissing should complete the game
  if (showingEpilogue) {
    setSession((prev) => prev ? {
      ...prev,
      active_cutscene: null,
      phase: GAME_PHASES.COMPLETE
    } : null);
    await dismissCutscene(session.id);
    await advanceToNextScene(session.id, null);  // null = end of adventure
    return;
  }
  // ... normal dismiss logic
};
```

### Key Files
- `src/pages/DMPage.tsx` - `handleDismissCutscene()`

---

## 34. Adventure JSON Overriding Code Defaults

### Problem
Seeker's Lens puzzle barely required any tilt to find the hidden object, even though code had a strict tolerance.

### Root Cause
The adventure JSON had `directionToleranceDegrees: 15` which overrode the code's default of 5. The JSON value was too lenient.

### Solution
Updated the adventure JSON to use a stricter tolerance:

```json
{
  "sceneType": "puzzle-seeker-lens",
  "puzzleInstructions": {
    "type": "seeker-lens",
    "directionToleranceDegrees": 3  // Was 15, now 3 (very strict)
  }
}
```

### Key Insight
Always check if adventure JSON has values that override code defaults. The JSON is the source of truth for adventure-specific settings.

### Key Files
- `src/data/adventures/ancient-shrine-adventure.json`
- `src/components/SeekerLensPuzzle.tsx` - Default tolerance in code

---

## 35. Adding New Puzzle Types

### Checklist for adding a new puzzle type (e.g., Memory Match):

1. **Type definitions** (`src/types/adventure.ts`):
   ```typescript
   export type SceneType = 'standard' | 'puzzle-physical' | ... | 'puzzle-memory';

   export interface MemoryPuzzleInstructions {
     type: 'memory';
     pairs: MemoryPair[];
     prompt: string;
   }
   ```

2. **Helper functions** (`src/lib/adventures.ts`):
   ```typescript
   export function isMemoryPuzzle(scene: Scene): boolean {
     return scene.sceneType === 'puzzle-memory';
   }

   export function getMemoryPuzzleInstructions(scene: Scene): MemoryPuzzleInstructions | null {
     // Extract and return instructions
   }
   ```

3. **Update `isPuzzleScene()`** (`src/lib/adventures.ts`):
   ```typescript
   export function isPuzzleScene(scene: Scene): boolean {
     return scene.sceneType === 'puzzle-physical' ||
            scene.sceneType === 'puzzle-ingame' ||
            scene.sceneType === 'puzzle-seeker-lens' ||
            scene.sceneType === 'puzzle-memory';  // ← Add new type
   }
   ```

4. **Create component** (`src/components/MemoryPuzzle.tsx`)

5. **Add to PlayPage.tsx** - Render the puzzle when active
6. **Add to DMPage.tsx** - Add DM controls for the puzzle type

### Key Files
- `src/types/adventure.ts`
- `src/lib/adventures.ts`
- `src/pages/PlayPage.tsx`
- `src/pages/DMPage.tsx`
- `src/components/[PuzzleName].tsx`

---

## 36. Broken Image Fallbacks

### Problem
Reward images showed broken placeholder or nothing when the image URL was invalid or missing.

### Solution
Use a star emoji as universal fallback for rewards:

```tsx
{reward.imageUrl ? (
  <img src={reward.imageUrl} alt={reward.name} ... />
) : (
  <div className="w-14 h-14 bg-gradient-to-br from-amber-200 to-yellow-300 rounded-xl flex items-center justify-center text-3xl">
    ⭐
  </div>
)}
```

For adventure data, set empty string instead of broken URL:
```json
{
  "id": "lumen-spirit",
  "name": "Lumen the Shrine Spirit",
  "imageUrl": ""  // Empty triggers fallback, broken URL shows error
}
```

### Key Files
- `src/components/CutsceneOverlay.tsx`
- `src/pages/EndingPage.tsx`
- Adventure JSON files

---

## 37. Git LFS Images Not Deploying to Vercel (from GitLab)

### Problem
All images showed as broken/placeholders on Vercel, even though they existed locally and `curl` returned HTTP 200. Images were only 132 bytes instead of actual file sizes.

### Root Cause
Images were stored in Git LFS. Vercel's auto-deploy from GitLab does NOT support Git LFS - it only deploys the pointer files (small text files containing LFS metadata), not the actual images.

The pointer files look like:
```
version https://git-lfs.github.com/spec/v1
oid sha256:1d8da35fcc6b041fecfb4cea5d9e5f44061ba61300604d83841406da3ac6000d
size 1384441
```

### Solution
**Migrate images OUT of Git LFS entirely:**

```bash
# Fetch all LFS files locally first
git lfs fetch --all

# Migrate all image types out of LFS (rewrites history)
git lfs migrate export --include="*.png,*.jpg,*.jpeg,*.webp" --everything

# Clean up .gitattributes (remove LFS rules)
echo "* text=auto" > .gitattributes

# Commit the cleanup
git add .gitattributes
git commit -m "chore: remove Git LFS, serve images directly"

# Force push (requires temporarily unprotecting branch in GitLab)
git push --force origin main
```

### Key Insight
- Vercel CLI (`vercel --prod --force`) uploads local files directly - this WOULD work with LFS if files are pulled locally
- But GitLab auto-deploy does NOT pull LFS files
- Simplest solution: Don't use LFS for a Vercel-deployed project

### Verification
Check if an image is real or a pointer:
```bash
curl -sI "https://your-site.vercel.app/images/some-image.png" | grep content-length
# Real image: content-length: 1384441 (large)
# LFS pointer: content-length: 132 (tiny)
```

### Key Files
- `.gitattributes` - LFS tracking rules (removed)

---

## 38. Dice Animation Restarting in Infinite Loop

### Problem
Dice animation kept showing "5 Nice roll!" repeatedly instead of completing and showing the cutscene.

### Root Cause
The `DiceRollAnimation` component's useEffect had `onComplete` in its dependency array:

```tsx
// WRONG - effect restarts when onComplete reference changes
useEffect(() => {
  const timers = [...];
  timers.push(setTimeout(() => onComplete(), 2000));
  return () => timers.forEach(clearTimeout);
}, [onComplete]); // ← onComplete changes on every parent render
```

In PlayPage, `onComplete` was an inline arrow function:
```tsx
<DiceRollAnimation
  onComplete={() => {
    setProcessedRollCount(prev => prev + 1);
    setPendingDiceRoll(null);
  }}
/>
```

PlayPage polls every 1 second, causing re-renders. Each re-render created a new `onComplete` function reference, which triggered the useEffect to restart, clearing all timers and starting the animation over.

### Solution
Use a ref to store the callback so the effect only runs once:

```tsx
export default function DiceRollAnimation({ onComplete, ... }) {
  // Store callback in ref - doesn't trigger effect reruns
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timers = [...];
    timers.push(setTimeout(() => onCompleteRef.current(), 2000));
    return () => timers.forEach(clearTimeout);
  }, []); // ← Empty deps - runs once on mount
}
```

### Key Insight
When passing callbacks to components with timer-based effects, either:
1. Wrap the callback in `useCallback` in the parent
2. Use a ref in the child to avoid effect dependency

### Key Files
- `src/components/DiceRollAnimation.tsx`

---

## 39. Solo Adventure Cutscene Requiring Two Taps to Advance

### Problem
After a dice roll and cutscene, the DM had to tap "Next Scene" twice:
1. First tap (purple button) - only dismissed the cutscene
2. Second tap (green button) - actually advanced to next scene

### Root Cause
The purple "Next Scene" button called `handleDismissCutscene()` which only dismissed the cutscene:

```tsx
const handleDismissCutscene = async () => {
  setSession((prev) => prev ? { ...prev, active_cutscene: null } : null);
  await dismissCutscene(session.id);
  // Stopped here - didn't advance scene
};
```

For solo adventures, the button text said "Next Scene" (implying it would advance), but it only dismissed.

### Solution
For solo adventures, also advance to the next scene after dismissing:

```tsx
const handleDismissCutscene = async () => {
  // Dismiss the cutscene
  setSession((prev) => prev ? { ...prev, active_cutscene: null } : null);
  await dismissCutscene(session.id);

  // For solo adventures, also advance to next scene automatically
  const isSoloAdventure = players.length === 1;
  if (isSoloAdventure && allActed && currentScene && !currentScene.isClimax) {
    await handleNextScene();
  }
};
```

### Key Insight
Button labels should match behavior. If it says "Next Scene", it should advance the scene, not just dismiss a modal.

### Key Files
- `src/pages/DMPage.tsx` - `handleDismissCutscene()`

---

## 40. Debug UI Left in Production

### Problem
Red debug boxes showing session state (scene_id, puzzle_started, etc.) were visible on both DM and Player screens in production.

### Root Cause
Debug UI was added during development and not removed:

```tsx
<div className="fixed top-2 left-2 z-[100] bg-red-600 text-white text-xs font-mono px-3 py-2 rounded-md">
  <div className="font-bold">DEBUG SESSION</div>
  <div>scene_id: {session.current_scene_id ?? 'null'}</div>
  ...
</div>
```

### Solution
Remove the debug boxes from both pages before deploying to production.

### Key Insight
Before any release:
1. Search for "DEBUG" in the codebase
2. Search for `bg-red-` styled fixed elements
3. Check both DM and Player screens visually

### Key Files
- `src/pages/DMPage.tsx`
- `src/pages/PlayPage.tsx`

---

## 41. Puzzle Success Not Showing on DM Screen

### Problem
When a player completed a puzzle successfully on their screen (DragPuzzle, SeekerLensPuzzle, MemoryPuzzle), the DM screen never showed the success. Only the "Override: Mark Complete" button worked.

### Root Cause
DMPage's subscription handler was rejecting puzzle completion updates from the database:

```tsx
// WRONG - blocks legitimate player completions
if (prev?.puzzle_started && !prev?.puzzle_completed && newSession.puzzle_completed) {
  // "This is likely a stale update - ignore the puzzle_completed field"
  return { ...newSession, puzzle_completed: prev.puzzle_completed, puzzle_outcome: prev.puzzle_outcome };
}
```

The logic assumed: "If MY local state says the puzzle isn't complete, any incoming `puzzle_completed: true` must be stale data."

But the actual flow is:
1. DM clicks "Start Challenge" → `puzzle_started: true`
2. Player completes puzzle → calls `completePuzzle(session.id, 'success')`
3. Database updates with `puzzle_completed: true, puzzle_outcome: 'success'`
4. Subscription delivers update to DMPage
5. **DMPage rejects it** because local `puzzle_completed` is still false
6. DM never sees the success

The override button worked because it called `setSession()` directly, bypassing the subscription handler.

### Solution
Remove the blocking logic - accept puzzle completion updates from the database:

```tsx
// CORRECT - accept puzzle completions (this is how player reports success)
// Just return the new session without filtering puzzle fields
return newSession;
```

### Key Insight
When two screens (DM and Player) can both update the same state, don't assume updates from the database are "stale" just because local state differs. The database is the source of truth for player actions.

### Key Files
- `src/pages/DMPage.tsx` - `handleSessionUpdate()` subscription handler
