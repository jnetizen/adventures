# Constraints

This document outlines technical, product, design, and platform constraints that shape the Adventures app.

## Technical Constraints

### Supabase Limits
- **Free Tier**: 
  - 500MB database storage
  - 2GB bandwidth/month
  - 50,000 monthly active users
  - Realtime connections: 200 concurrent
- **Implications**: 
  - Need to monitor database size (sessions table)
  - May need cleanup job for old sessions
  - Realtime should handle typical family use (2-4 devices)

### Browser Support
- **Target**: Modern browsers (Chrome, Safari, Firefox, Edge)
- **Mobile**: iOS Safari, Chrome on Android
- **Not Supported**: IE11, very old browsers
- **Implications**: Can use modern JavaScript features, CSS Grid/Flexbox

### Network Requirements
- **Requirement**: Internet connection required for real-time sync
- **Implications**: 
  - No offline play (except cached content viewing)
  - Requires stable WiFi for best experience
  - Network errors need clear messaging

### Performance
- **Target**: Load time < 3 seconds on 3G
- **Bundle Size**: Keep under 500KB gzipped (current: ~134KB)
- **Image Optimization**: Need WebP/optimized formats
- **Implications**: 
  - Code splitting may be needed
  - Lazy load images
  - Minimize dependencies

---

## Product Constraints

### Target Age: 5-7 Years Old
- **Reading Level**: Limited reading ability
- **Attention Span**: 10-20 minutes typical
- **Motor Skills**: Touch-friendly, large targets
- **Emotional**: No "failure" states, all positive outcomes
- **Implications**:
  - Simple UI, minimal text
  - Short adventures (15-20 minutes)
  - Visual over textual
  - Celebratory tone always

### Parent as DM
- **Time**: Parents have limited time
- **Tech Comfort**: Varies widely
- **Multi-tasking**: Managing app while watching kids
- **Implications**:
  - Simple DM interface
  - Clear instructions
  - Fast setup (< 2 minutes)
  - Can't be too complex

### Two-Screen Setup
- **Requirement**: DM device + Player device
- **Implications**:
  - Can't assume same device
  - Need room code connection
  - Sync must be reliable
  - Different UI for each screen

### No User Accounts
- **Decision**: Room codes only, no login
- **Implications**:
  - No persistent history
  - No cross-device profiles
  - No saved progress
  - Privacy-friendly but limited features

---

## Design Constraints

### Mobile-First
- **Requirement**: Works on phones and tablets
- **Screen Sizes**: iPhone SE to iPad Pro
- **Implications**:
  - Responsive design required
  - Touch targets ≥ 44px
  - Readable text on small screens
  - Landscape and portrait support

### Read-Aloud Design
- **Requirement**: Parent reads narration/prologue aloud
- **Implications**:
  - Text must be readable on phone
  - Appropriate length (2-3 sentences)
  - Clear, engaging language
  - Pacing considerations

### Real-Time Sync
- **Requirement**: Changes appear instantly on both screens
- **Implications**:
  - WebSocket connection required
  - Handle connection drops gracefully
  - Show connection status
  - Optimistic UI updates

### No Persistent Storage (Local)
- **Decision**: No localStorage for game state
- **Implications**:
  - All state in database
  - Refresh loses progress (unless in DB)
  - Can't work offline

---

## Platform Constraints

### Web Only (Currently)
- **Platform**: Progressive Web App (PWA) or web app
- **Not Native**: No iOS/Android apps
- **Implications**:
  - Browser limitations
  - No app store distribution
  - Can be installed as PWA (future)
  - Cross-platform by default

### Supabase Dependency
- **Vendor**: Supabase for backend
- **Implications**:
  - Vendor lock-in
  - Subject to Supabase changes
  - Migration would be significant effort
  - Free tier sufficient for now

### Single Language (English)
- **Current**: English only
- **Implications**:
  - No i18n needed yet
  - Can hardcode strings
  - Future: Would need translation system

---

## Time/Resource Constraints

### Development Time
- **Current**: Prototype stage, limited development time
- **Implications**:
  - Prioritize core features
  - Defer nice-to-haves
  - Quick iterations
  - Focus on usability over polish

### Content Creation
- **Constraint**: Adventure creation is manual (JSON editing)
- **Implications**:
  - Limited number of adventures
  - Time-consuming to create new ones
  - Need tools or process improvement

### Testing Resources
- **Constraint**: Limited user testing (family/friends)
- **Implications**:
  - Small sample size
  - May miss edge cases
  - Need structured feedback process

---

## Business/Product Constraints

### No Monetization (Currently)
- **Status**: Free, no revenue model
- **Implications**:
  - No paid features
  - No subscription
  - Free tier services only
  - Community-driven

### Privacy-First
- **Requirement**: Minimal data collection
- **Implications**:
  - No analytics tracking (or opt-in only)
  - No user accounts
  - No personal data storage
  - GDPR-friendly by design

### Family Use Case
- **Focus**: Single-family sessions
- **Not**: Multi-family, public sessions
- **Implications**:
  - Room codes are sufficient
  - No need for public lobbies
  - Privacy by default

---

## Technical Debt Constraints

### TypeScript Strictness
- **Current**: Some `any` types, loose typing
- **Implications**:
  - Potential runtime errors
  - Less IDE support
  - Future: Stricter typing

### Error Handling
- **Current**: Basic error handling
- **Implications**:
  - Some errors may not be caught
  - User-facing errors may be unclear
  - Future: Comprehensive error handling

### Testing
- **Current**: Manual testing only
- **Implications**:
  - No automated tests
  - Regression risk
  - Future: Add unit/integration tests

---

## Future Constraint Considerations

### Scale
- **If Popular**: May exceed Supabase free tier
- **Consideration**: Migration plan needed
- **Options**: Paid tier, self-hosted, alternative

### Content Volume
- **If Many Adventures**: JSON files become unwieldy
- **Consideration**: Database or CMS for content
- **Options**: Supabase storage, headless CMS

### Feature Complexity
- **If Adding Features**: May outgrow current architecture
- **Consideration**: Refactoring needed
- **Options**: Modular architecture, microservices (overkill for now)

---

## Constraint Log Template

```markdown
### [Constraint Name]
**Type**: [Technical / Product / Design / Platform / Time / Business]
**Description**: 
[What the constraint is]

**Impact**: 
[How it affects the product]

**Workarounds**: 
[How we work around it, if any]

**Future Considerations**:
[What might change this constraint]
```
