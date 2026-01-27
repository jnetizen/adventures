# Design Decisions

This document captures key design decisions, why we chose certain approaches, trade-offs made, and alternatives considered.

## Decision Format

Each decision includes:
- **Date**: When the decision was made
- **Context**: What problem we were solving
- **Decision**: What we chose
- **Rationale**: Why we chose it
- **Alternatives**: What else we considered
- **Trade-offs**: What we gave up or gained

---

## Core Architecture

### DM Controls All Choices (Not Kids)
**Date**: Initial design | **Status**: Current

**Context**: Need to determine who makes choices during character turns.

**Decision**: Parent (DM) selects the choice and enters dice roll on their device. Kids watch on player screen but don't interact.

**Rationale**:
- Simplifies technical implementation (no role-based UI needed)
- Parent can guide story based on kids' reactions
- Reduces complexity for 5-7 year olds
- Parent maintains control over pacing

**Alternatives Considered**:
- Kids select choices on player device
- Kids roll dice on player device
- Hybrid: kids suggest, parent confirms

**Trade-offs**:
- ✅ Simpler code, no authentication needed
- ✅ Parent can adapt to kids' energy/attention
- ❌ Less interactive for kids
- ❌ Parent has to manage both screens

**Future Consideration**: May add player-driven choices as optional feature (see IDEAS.md)

---

### Room Codes Instead of User Accounts
**Date**: Initial design | **Status**: Current

**Context**: Need way to connect DM and player devices.

**Decision**: Use 4-letter room codes. No user accounts, authentication, or persistent profiles.

**Rationale**:
- Zero friction to start playing
- No email/password management
- Works for one-time family sessions
- Privacy-friendly (no data collection)

**Alternatives Considered**:
- User accounts with login
- QR codes
- Bluetooth/NFC pairing
- Invite links

**Trade-offs**:
- ✅ Fastest to get started
- ✅ No privacy concerns
- ✅ Works offline (once connected)
- ❌ No history tracking
- ❌ Can't resume sessions
- ❌ No cross-device sync for same user

---

### Supabase Realtime for Sync
**Date**: Initial design | **Status**: Current

**Context**: Need real-time synchronization between DM and player screens.

**Decision**: Use Supabase Realtime (PostgreSQL changes via WebSocket).

**Rationale**:
- Built-in real-time capabilities
- PostgreSQL backend (familiar, reliable)
- Free tier sufficient for prototype
- Easy to set up and deploy

**Alternatives Considered**:
- Firebase Realtime Database
- WebRTC peer-to-peer
- Polling
- Server-Sent Events (SSE)

**Trade-offs**:
- ✅ Simple setup, good documentation
- ✅ Reliable, battle-tested
- ✅ Free tier for development
- ❌ Requires internet connection
- ❌ Vendor lock-in to Supabase
- ❌ Potential cost at scale

---

## v2 Features

### Cumulative Scoring System
**Date**: v2 implementation | **Status**: Current

**Context**: Want to add replay value and make choices matter across the whole adventure.

**Decision**: Track cumulative `success_count` across all scenes. Each successful roll (roll >= threshold) increments the count. Ending determined by thresholds (e.g., 0-7 = good, 8-11 = great, 12+ = legendary).

**Rationale**:
- Creates sense of progression
- Makes every choice matter
- Encourages replay to get better ending
- Simple to understand (just count successes)

**Alternatives Considered**:
- Per-scene scoring (reset each scene)
- Weighted scoring (some choices worth more)
- Failure tracking (count failures instead)
- No scoring (just story progression)

**Trade-offs**:
- ✅ Simple mental model
- ✅ Visible progress (DM sees count)
- ✅ Motivates engagement
- ❌ Could stress kids if they know they're "failing"
- ❌ Requires careful threshold tuning

**Implementation Note**: Success count is parent-only (shown on DM screen, not player screen) to avoid pressure on kids.

---

### Tiered Endings (Good/Great/Legendary)
**Date**: v2 implementation | **Status**: Current

**Context**: Want endings to feel rewarding regardless of performance, but still acknowledge excellence.

**Decision**: Three tiers (good, great, legendary) with different narration and rewards. All endings are celebratory (no "bad" ending).

**Rationale**:
- Age-appropriate (5-7 year olds shouldn't feel like they "lost")
- Still provides motivation to do well
- Different rewards create replay incentive
- All endings feel like success

**Alternatives Considered**:
- Binary (success/fail)
- Single ending regardless of score
- More tiers (4-5 levels)
- Bad endings for low scores

**Trade-offs**:
- ✅ Positive experience for all kids
- ✅ Encourages replay
- ✅ Rewards excellence without punishing
- ❌ Less dramatic tension
- ❌ May reduce sense of achievement for "good" ending

---

### Prologue Screen Before Scene 1
**Date**: v2 implementation | **Status**: Current

**Context**: Need to set up world, characters, and mission before starting scenes.

**Decision**: Show dedicated prologue screen after character assignment, before Scene 1. Includes world intro, character intros, and mission brief. "Start Adventure" button proceeds to Scene 1.

**Rationale**:
- Gives context before action starts
- Helps kids understand who they're playing
- Sets expectations for the adventure
- Natural reading-aloud moment for parent

**Alternatives Considered**:
- Prologue as Scene 0 (part of scene flow)
- Prologue text in Scene 1 narration
- Skip prologue, jump straight to action
- Prologue as optional (skip button)

**Trade-offs**:
- ✅ Better story setup
- ✅ Clear character introduction
- ✅ Dedicated moment for context
- ❌ Adds one more screen/step
- ❌ Could feel like delay before fun starts

---

### Adventure Selection Screen
**Date**: v2 implementation | **Status**: Current

**Context**: With multiple adventures, need way to choose which to play.

**Decision**: Grid-based selection screen showing preview cards with image, title, tagline, themes, and estimated time. Replaces simple dropdown.

**Rationale**:
- Visual and engaging
- Shows key info (themes, time) to help decision
- Scales well as more adventures added
- Better UX than dropdown

**Alternatives Considered**:
- Dropdown menu (original v1 approach)
- List view
- Random adventure button
- Adventure recommendation based on history

**Trade-offs**:
- ✅ More engaging and informative
- ✅ Better for multiple adventures
- ✅ Shows preview images
- ❌ Takes more screen space
- ❌ More complex than dropdown

---

### Scene Numbering (0-based)
**Date**: Initial implementation | **Status**: Current

**Context**: How to index scenes in code vs. display to users.

**Decision**: Store scenes as 0-based indices (0, 1, 2, 3, 4) in code and database. Display as 1-based (Scene 1, Scene 2, etc.) to users.

**Rationale**:
- Standard programming practice (array indexing)
- Matches TypeScript/JavaScript conventions
- Database stores as integer
- Easy conversion for display

**Alternatives Considered**:
- 1-based everywhere (confusing in code)
- Store as strings ("scene-1", "scene-2")

**Trade-offs**:
- ✅ Natural for developers
- ✅ Efficient storage
- ❌ Requires conversion for display
- ❌ Easy to mix up 0-based vs 1-based

---

## UI/UX Decisions

### Full-Screen Scene Images on Player Screen
**Date**: v2 UI overhaul | **Status**: Current

**Context**: How to display scenes on player (kids') screen.

**Decision**: Scene images are full-screen or near full-screen. Characters are part of the scene artwork (not separate avatars). Overlay content (results, turns) appears on top.

**Rationale**:
- Immersive experience for kids
- Characters feel part of the world
- Less UI clutter
- Focus on story visuals

**Alternatives Considered**:
- Scene background with separate character avatars
- Split screen (scene + UI)
- Smaller scene with more UI elements

**Trade-offs**:
- ✅ More immersive
- ✅ Cleaner design
- ✅ Better for storytelling
- ❌ Less space for UI elements
- ❌ Requires high-quality scene images

---

### Text-Only Turn Indicators (No Character Avatars)
**Date**: v2 UI overhaul | **Status**: Current

**Context**: How to show "whose turn it is" on player screen.

**Decision**: Display only character name as text (e.g., "Oliver's turn!") without highlighting avatar image.

**Rationale**:
- Simpler, less visual clutter
- Characters already in scene images
- Clear enough for kids
- Faster to render

**Alternatives Considered**:
- Highlight character avatar
- Show character image separately
- Animate character in scene

**Trade-offs**:
- ✅ Cleaner UI
- ✅ Less distracting
- ❌ Less visual emphasis
- ❌ May be harder to spot for some kids

---

### Parent-Only Success Count Display
**Date**: v2 implementation | **Status**: Current

**Context**: Where to show cumulative success count.

**Decision**: Show success count only on DM screen (parent-only), subtle display in header. Not shown on player screen.

**Rationale**:
- Avoids pressure on kids
- Parent can track progress
- Keeps player screen focused on story
- Reduces comparison/competition

**Alternatives Considered**:
- Show on both screens
- Hide completely
- Show only at end

**Trade-offs**:
- ✅ No pressure on kids
- ✅ Parent can guide if needed
- ❌ Kids don't see their progress
- ❌ Less transparency

---

## Data Model Decisions

### JSON Adventure Files (Not Database)
**Date**: Initial design | **Status**: Current

**Context**: Where to store adventure content.

**Decision**: Store adventures as JSON files in `src/data/adventures/`. Load at runtime. Not stored in database.

**Rationale**:
- Easy to version control
- Simple to edit
- No database queries for content
- Can be bundled with app

**Alternatives Considered**:
- Store in database
- External API
- CMS integration

**Trade-offs**:
- ✅ Simple, fast
- ✅ Version controlled
- ✅ No database queries
- ❌ Requires code deploy to update
- ❌ Can't update without redeploy

---

### Session State in Database
**Date**: Initial design | **Status**: Current

**Context**: Where to store game session state.

**Decision**: Store all session state in Supabase `sessions` table. Use Realtime to sync changes.

**Rationale**:
- Single source of truth
- Real-time sync built-in
- Persistent across refreshes
- Easy to debug (can inspect DB)

**Alternatives Considered**:
- Local storage only
- In-memory state
- Hybrid (local + sync)

**Trade-offs**:
- ✅ Reliable sync
- ✅ Persistent
- ✅ Multi-device support
- ❌ Requires internet
- ❌ Database dependency

---

## Future Decisions to Make

### Player-Driven Choices
**Status**: Under consideration (see IDEAS.md)
- Should kids be able to select choices?
- How to handle authentication/role assignment?
- What if kid selects wrong choice?

### Adventure Persistence
**Status**: Under consideration
- Should sessions persist after completion?
- Should we track adventure history?
- How long to keep old sessions?

### Mobile App vs Web
**Status**: Under consideration
- Stay web-only or build native apps?
- PWA as middle ground?
- App store distribution?

---

## Decision Log Template

```markdown
### [Decision Title]
**Date**: [YYYY-MM-DD]
**Context**: 
[What problem were we solving?]

**Decision**: 
[What we chose]

**Rationale**: 
[Why we chose it]

**Alternatives Considered**:
- [Alternative 1]
- [Alternative 2]

**Trade-offs**:
- ✅ [Benefit]
- ❌ [Cost/limitation]

**Future Considerations**:
[What might change this decision?]
```
