# Refactor Plan

## Top Cleanup Targets (in priority order)
1) src/pages/DMPage.tsx — reduce file size, dedupe UI helpers, isolate pure logic.
2) src/pages/PlayPage.tsx — mirror DMPage cleanup patterns.
3) src/lib/gameState.ts — reduce branching and clarify operation flows.
4) src/lib/adventures.ts — split parsing/lookup helpers from game logic.
5) src/hooks/useSessionSubscription.ts — tighten responsibilities and data validation.

## Refactor Rules
- One small step per commit.
- Build must pass after each step (`npm run build`).
- No behavior changes.
- No rewrites.
- Keep diffs small and reviewable.

## Next Step Order (smallest/safest first)
- [ ] Extract a pure helper for outcome resolution in src/pages/DMPage.tsx
- [ ] Extract shared display-name helpers in src/pages/PlayPage.tsx
- [ ] Dedupe split-scene status UI helpers in src/pages/DMPage.tsx
- [ ] Move non-React pure helpers from src/pages/DMPage.tsx into src/lib/dmDerivedState.ts
- [ ] Consolidate cutscene logging/handling into a helper in src/pages/DMPage.tsx
- [ ] Extract dice/threshold display helpers in src/pages/DMPage.tsx
- [ ] Isolate adventure selection logic into a small helper in src/pages/DMPage.tsx
- [ ] Dedupe “active character turn” formatting in src/pages/DMPage.tsx and src/pages/PlayPage.tsx
- [ ] Extract scene outcome rendering helpers in src/pages/DMPage.tsx
- [ ] Move scene/turn lookup helpers from src/lib/adventures.ts into a focused module
