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
- Current recommended model: `gemini-2.5-flash-image` (better quality than 2.0-flash)
- Do NOT mix 2.0-flash and 2.5-flash images in the same adventure

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

1. **Subscription overwrites optimistic updates** - Always preserve local state when appropriate

2. **Video autoplay blocked** - Must be muted for autoplay to work

3. **Scene numbers start at 0** - Not 1

4. **Character IDs must be consistent** - Across JSON, file names, and code

5. **Git LFS files appear as text** - Run `git lfs pull`

6. **TypeScript errors from JSON** - Cast imports: `import data from './file.json'` then use `data as Adventure`

7. **Hooks must be in same order** - Declare all `useState` at top of component

8. **Async timing in React** - State updates from `setSession` don't take effect immediately; use functional updates: `setSession((prev) => ...)`

---

## 11. Testing Checklist

Before playtesting a new adventure:

- [ ] All scene numbers start from 0
- [ ] All character IDs match across JSON
- [ ] All cutscene images exist at referenced paths
- [ ] Climax video exists (if using video mode)
- [ ] Run `git lfs pull` to get actual image/video files
- [ ] Check browser console for errors during playthrough
- [ ] Test both cutscenes mode and video mode for climax
- [ ] Test all character paths in parallel scenes
