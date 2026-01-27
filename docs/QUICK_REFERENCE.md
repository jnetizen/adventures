# Quick Reference

Common tasks, file locations, and key concepts for the Adventures app.

## Common Tasks

### Adding a New Adventure

1. **Create JSON file** in `src/data/adventures/[adventure-id].json`
2. **Follow v2 schema** (see Adventure Data Format below)
3. **Adjust sceneNumbers** to 0-based (0, 1, 2, 3, 4)
4. **Add to loader** in `src/lib/adventures.ts`:
   ```typescript
   import newAdventure from '../data/adventures/new-adventure.json';
   const adventures: Record<string, Adventure> = {
     // ... existing
     'new-adventure-id': newAdventure as Adventure,
   };
   ```
5. **Add scene images** to `public/images/scenes/` (match `sceneImageUrl` paths)
6. **Add character images** to `public/images/characters/` (if used)
7. **Test** the adventure end-to-end

### Running Database Migrations

```bash
# Create new migration
npm run db:migrate:new migration_name

# Apply migrations
npm run db:migrate

# Check migration status
npm run db:status
```

### Testing the App

1. **Start dev server**: `npm run dev`
2. **Open on two devices** (or two browser windows)
3. **DM device**: Navigate to `/dm`
4. **Player device**: Navigate to `/play`
5. **Follow test scenarios** in `docs/TESTING.md`

### Building for Production

```bash
npm run build
```

Output goes to `dist/` directory.

### Deploying

1. Build: `npm run build`
2. Deploy `dist/` to hosting (Vercel, Netlify, etc.)
3. Ensure environment variables are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## File Locations

### Adventure Data
- **Adventure JSON files**: `src/data/adventures/*.json`
- **Scene images**: `public/images/scenes/*.png`
- **Character images**: `public/images/characters/*.png`
- **Adventure preview images**: `public/images/adventures/*.png`
- **Reward images**: `public/images/rewards/*.png`

### Source Code
- **Pages**: `src/pages/`
  - `LandingPage.tsx` - Home page
  - `DMPage.tsx` - Parent/DM interface
  - `PlayPage.tsx` - Kids/player interface
  - `ProloguePage.tsx` - Prologue screen
  - `AdventureSelectPage.tsx` - Adventure selection
  - `EndingPage.tsx` - Ending display
- **Components**: `src/components/`
  - `RoomCode.tsx` - Room code display
  - `ConnectionStatus.tsx` - Connection indicator
  - `PlaceholderImage.tsx` - Image placeholder
  - `AnimationIndicator.tsx` - Animation key visual
- **Library**: `src/lib/`
  - `adventures.ts` - Adventure loading/helpers
  - `gameState.ts` - Game state management
  - `supabase.ts` - Supabase client
- **Types**: `src/types/`
  - `adventure.ts` - Adventure data types
  - `game.ts` - Game session types
  - `supabase.ts` - Database schema types

### Database
- **Migrations**: `supabase/migrations/*.sql`
- **Config**: `supabase/config.toml`

### Documentation
- **Docs**: `docs/`
  - `TESTING.md` - Testing guide
  - `IDEAS.md` - Future features
  - `DESIGN_DECISIONS.md` - Design rationale
  - `USER_RESEARCH.md` - User feedback
  - `CONSTRAINTS.md` - Technical constraints
  - `PRODUCT_VISION.md` - Product goals
  - `ADVENTURE_GENERATION_PROMPT.md` - Prompt for AI adventure generation
  - `QUICK_REFERENCE.md` - This file

---

## Key Concepts

### Sessions
- **What**: A game session connecting DM and players
- **Storage**: Supabase `sessions` table
- **Lifecycle**: Created → Playing → Ended
- **Key Fields**:
  - `room_code`: 4-letter code for joining
  - `adventure_id`: Which adventure is being played
  - `players`: Array of `{kidName, characterId}`
  - `current_scene`: Current scene number (0-4)
  - `phase`: `waiting` | `playing` | `results_revealed` | `paused`
  - `success_count`: Cumulative successful rolls
  - `scene_choices`: Choices made this scene

### Scenes
- **What**: A single scene in an adventure (5 scenes per adventure)
- **Numbering**: 0-based in code (0, 1, 2, 3, 4), 1-based in display
- **Structure**:
  - `narrationText`: Read aloud by parent
  - `sceneImageUrl`: Full-screen image on player screen
  - `characterTurns`: Each character acts once
  - `outcome`: Scene conclusion and rewards

### Character Turns
- **What**: One character's action in a scene
- **Order**: All characters act before results are revealed
- **Process**:
  1. DM sees prompt for character
  2. DM selects choice
  3. DM enters dice roll (1-20)
  4. Success if roll >= `successThreshold`
  5. Success count increments if successful
  6. Next character's turn

### Scoring
- **Cumulative**: Success count tracks across all scenes
- **Increment**: On successful roll (roll >= threshold)
- **Reset**: When starting new adventure
- **Display**: Only on DM screen (parent-only)

### Endings
- **Tiers**: Good (0-7), Great (8-11), Legendary (12+)
- **Calculation**: First threshold where `success_count >= minSuccesses`
- **Display**: After final scene, on both DM and player screens
- **All Positive**: No "bad" endings, all celebratory

---

## Adventure Data Format (v2)

### Required Fields
```json
{
  "id": "adventure-id",
  "title": "Adventure Title",
  "description": "Brief description",
  "preview": {
    "tagline": "Exciting tagline",
    "themes": ["theme1", "theme2"],
    "estimatedMinutes": 15,
    "previewImageUrl": "/images/adventures/preview.png"
  },
  "prologue": {
    "worldIntro": "World description",
    "characterIntros": [
      {
        "characterId": "char-id",
        "introText": "Character intro"
      }
    ],
    "missionBrief": "Mission description"
  },
  "characters": [...],
  "scoring": {
    "thresholds": [
      { "minSuccesses": 12, "endingId": "ending-legendary" },
      { "minSuccesses": 8, "endingId": "ending-great" },
      { "minSuccesses": 0, "endingId": "ending-good" }
    ]
  },
  "scenes": [...],
  "endings": [...]
}
```

### Scene Structure
- `sceneNumber`: 0-4 (0-based)
- `narrationText`: 2-3 sentences max
- `characterTurns`: One per character
- `outcome.nextSceneId`: `null` for final scene

### Choice Structure
- `successThreshold`: Typically 10 (or 5 for celebration scenes)
- `successOutcome` and `failOutcome`: Both positive, move story forward

---

## Troubleshooting

### Room Code Not Working
- Check Supabase connection (ConnectionStatus indicator)
- Verify room code is exact (case-sensitive)
- Check if session exists in database
- Try creating new session

### Real-Time Sync Not Working
- Check ConnectionStatus on both screens
- Verify Realtime is enabled in Supabase dashboard
- Check browser console for errors
- Ensure both devices on same network

### Images Not Loading
- Verify image paths in adventure JSON
- Check files exist in `public/images/`
- Ensure paths start with `/images/`
- Check browser console for 404 errors

### Success Count Not Updating
- Verify migration applied (`success_count` column exists)
- Check browser console for errors
- Verify roll >= threshold
- Check Supabase database directly

### Adventure Not Loading
- Verify JSON is valid (use JSON validator)
- Check adventure ID matches in `adventures.ts`
- Verify all required fields present
- Check browser console for errors

### Build Errors
- Run `npm run build` to see full errors
- Check TypeScript types match JSON
- Verify all imports are correct
- Check for missing dependencies

---

## Development Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Database
npm run db:migrate        # Apply migrations
npm run db:migrate:new   # Create new migration
npm run db:status        # Check migration status
npm run db:reset         # Reset local DB (if using local)
```

---

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Useful Links

- **Supabase Dashboard**: [Your project dashboard]
- **Documentation**: `docs/` directory
- **Adventure Schema**: `src/types/adventure.ts`
- **Game Types**: `src/types/game.ts`

---

## Getting Help

1. **Check Documentation**: Start with `docs/QUICK_REFERENCE.md` and `docs/TESTING.md`
2. **Review Code**: Check relevant files in `src/`
3. **Check Supabase**: Verify database state and Realtime status
4. **Browser Console**: Look for errors or warnings
5. **Document Issues**: Add to `docs/TESTING.md` known issues log

---

## Quick Checklist for New Features

- [ ] Update TypeScript types if needed
- [ ] Add to appropriate page/component
- [ ] Test on both DM and player screens
- [ ] Verify real-time sync works
- [ ] Test on mobile devices
- [ ] Update documentation
- [ ] Add to testing checklist
- [ ] Consider accessibility
- [ ] Check performance impact
