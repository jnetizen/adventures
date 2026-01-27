# Future Feature Ideas

This document captures ideas for future features, enhancements, and research questions. Ideas are organized by category and include priority and status.

## Priority Levels
- **High**: Core to product vision, should be built soon
- **Medium**: Valuable but not critical, nice to have
- **Low**: Interesting but not urgent, explore later

## Status
- **Idea**: Initial concept, needs exploration
- **Investigating**: Researching feasibility/approach
- **Planned**: Decided to build, in roadmap
- **Backlog**: Validated but waiting for resources/priority
- **Addressed**: Implemented (v2 or later)
- **Partially addressed**: Some implementation done

---

## Playtest Feedback (Jan 2026) — Addressed vs Not

| Feedback | Status | Notes |
|----------|--------|-------|
| Prologue before Scene 1 | **Addressed** | v2 ProloguePage with world intro, character intros, mission brief |
| Character picker with illustrations / descriptions | **Addressed** | Assignment uses character cards: image, name, intro/description for parent to "sell" roles. |
| PlayPage image-only (no overlays) | **Addressed** | BUG-1 fixed: full-screen scene only, no overlays. |
| Immediate per-kid outcome (replace batched reveal) | **Addressed** | BUG-2 fixed: outcomes shown progressively; Reveal step removed. |
| Post-session feedback form | **Addressed** | FeedbackForm component; shown after "End Adventure"; stores rating, positive, negative, notes. |
| Rewards on player screen | **Addressed** | RewardCelebration component with confetti animation; shown per-scene and at ending on both screens. |
| Phase cleanup (e.g. `setup`, `prologue`, `complete`) | **Addressed** | Phases updated to `setup`, `prologue`, `playing`, `complete`, `paused`; migration created. |

---

## Player Experience (Kids' Screen)

### Player-Driven Choices
**Status**: Idea | **Priority**: High
- Allow kids to select their own choices from the player screen
- Kids enter dice rolls or use virtual dice roller
- Requires role-aware UI (know which kid is which character)
- May need authentication/session rules

### Sound Effects
**Status**: Idea | **Priority**: Medium
- Add optional audio for key moments (dice roll, reveal, scene advance)
- Use `animationKey` or phase to trigger clips
- Keep minimal and toggleable
- Consider age-appropriate sounds

### Character Animations
**Status**: Idea | **Priority**: Low
- Animate character avatars based on `animationKey`
- Visual feedback when choices succeed/fail
- Could use CSS animations or simple sprite sheets

### Interactive Elements
**Status**: Idea | **Priority**: Low
- Tap-to-explore elements in scene images
- Hidden rewards or easter eggs
- Age-appropriate mini-games during waiting periods

---

## DM Experience (Parent Screen)

### Adventure History
**Status**: Idea | **Priority**: Medium
- Track which adventures have been played
- Show completion status
- Suggest next adventure based on themes

### Session Analytics
**Status**: Idea | **Priority**: Low
- Show success rate per adventure
- Track average play time
- Compare performance across sessions

### Custom Dice Roller
**Status**: Addressed | **Priority**: Medium
- Built-in virtual dice roller
- Visual dice animation
- Could replace manual entry
- **Implemented**: DiceRoller component with 2D animation; integrated on DM screen (functional) and player screen (placeholder).

### Pause/Resume
**Status**: Idea | **Priority**: Medium
- Pause mid-adventure
- Resume later (session persistence)
- Useful for longer adventures or interruptions

### Quick Reference Cards
**Status**: Idea | **Priority**: Low
- Printable or on-screen reference for rules
- Character abilities summary
- Scene flow diagram

---

## Content & Adventures

### AI Adventure Generation (Agentic System)
**Status**: Idea | **Priority**: Medium
- **Multi-agent system for automated adventure creation:**
  1. **Story Generation Agent**: Uses [adventure generation prompt](ADVENTURE_GENERATION_PROMPT.md) to create complete adventure JSON
  2. **QA Agent**: Validates story against schema, checks tone/age-appropriateness, verifies structure
  3. **Human Checker**: Human review step for quality, creativity, and safety
  4. **Image Generation Agent**: Generates scene images (5 scenes) and character images (3 characters) based on story content
  5. **QA Agent (Final)**: Validates images match story, checks quality, ensures consistency
- **Output**: Complete adventure package (JSON + images) ready for testing
- **Benefits**: Rapid adventure creation, consistent quality, scalable content pipeline
- **Prompt stored**: See `docs/ADVENTURE_GENERATION_PROMPT.md` (used to generate v2 adventures)

### Adventure Editor
**Status**: Idea | **Priority**: High
- Visual editor for creating adventures
- Validate against schema
- Preview mode
- Export to JSON

### More Adventures
**Status**: Planned | **Priority**: High
- Create 3-5 more adventures
- Vary themes (space, ocean, forest, etc.)
- Different difficulty levels
- Seasonal adventures

### Adventure Marketplace
**Status**: Idea | **Priority**: Low
- Community-created adventures
- Share adventures with other families
- Rating/review system

### Adventure Variants
**Status**: Idea | **Priority**: Low
- Same adventure with different difficulty
- Different character sets
- Alternate endings

---

## Technical Improvements

### Offline Mode
**Status**: Idea | **Priority**: Medium
- Cache adventures locally
- Work without internet (limited features)
- Sync when connection restored

### Performance Optimization
**Status**: Idea | **Priority**: Medium
- Image optimization (WebP, lazy loading)
- Code splitting
- Reduce bundle size
- Faster initial load

### Error Recovery
**Status**: Addressed | **Priority**: High
- Better error messages
- Automatic retry for network issues
- Session recovery after crash
- **Implemented**: retryWithBackoff for all Supabase calls; session persistence to localStorage; ErrorBoundary for React errors; formatError for user-friendly messages; recovery UI on both screens.

### Accessibility
**Status**: Idea | **Priority**: Medium
- Screen reader support
- Keyboard navigation
- High contrast mode
- Text size options

### Progressive Web App (PWA)
**Status**: Idea | **Priority**: Medium
- Installable on devices
- Offline capabilities
- App-like experience

---

## Social/Sharing Features

### Adventure Sharing
**Status**: Idea | **Priority**: Low
- Share adventure completion
- Screenshot of ending
- Social media integration (parent-controlled)

### Family Profiles
**Status**: Idea | **Priority**: Low
- Track multiple kids
- Individual progress
- Achievement system

### Multi-Family Sessions
**Status**: Idea | **Priority**: Low
- Play with friends/family remotely
- Multiple DMs coordinating
- Larger group adventures

---

## Analytics & Insights

### Usage Analytics
**Status**: Idea | **Priority**: Low
- Track popular adventures
- Average session length
- Drop-off points
- Success rate patterns

### Parent Dashboard
**Status**: Idea | **Priority**: Low
- View all sessions
- See kids' favorite adventures
- Track reading/engagement time

### Feedback Collection
**Status**: Planned | **Priority**: Medium
- In-app feedback form (post-session; playtest requested)
- Rating system
- Feature requests
- Store with session: `feedback_rating`, `feedback_positive`, `feedback_negative`, `feedback_notes`

---

## Research Questions

### To Explore
- Should kids be able to make choices, or is DM control better?
- What's the optimal adventure length for 5-7 year olds?
- How important are rewards vs. story progression?
- Do tiered endings motivate replay, or is one ending enough?
- Should we support more than 3 players?
- Is cumulative scoring motivating or stressful for kids?
- How do parents feel about the DM role? Too much work?

---

## Quick Add Template

```markdown
### [Feature Name]
**Status**: Idea | **Priority**: [High/Medium/Low]
**Category**: [Player Experience / DM Experience / Content / Technical / Social / Analytics]
**Description**: 
[Brief description of the feature]

**Why**: 
[Why this would be valuable]

**Considerations**:
[Technical or design considerations]

**Related Ideas**:
[Link to related ideas if any]
```
