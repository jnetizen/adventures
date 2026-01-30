# Folder Map (Target Structure)

## Proposed src/ layout (3-layer split)
- pages/components
- services
- data
- lib
- types

## Target Structure (high-level)
```
src/
  pages/              # Page-level UI (DMPage, PlayPage, etc.)
  components/         # Reusable UI components
  services/           # App/services boundary (Supabase, orchestration)
  data/               # Static data and loaders (adventures JSON, parsing)
  lib/                # Pure utilities and shared helpers
  types/              # TS types re-exported from schemas/constants
```

## Current → Target (high level, no moves yet)
- src/pages/* → src/pages/* (no move)
- src/components/* → src/components/* (no move)
- src/hooks/* → src/services/ (session orchestration + realtime + offline sync)
- src/lib/gameState.ts → src/services/gameState.ts
- src/lib/offlineStorage.ts → src/services/offlineStorage.ts
- src/lib/adventures.ts → src/data/adventures.ts
- src/data/adventures/* → src/data/adventures/* (no move)
- src/lib/dmDerivedState.ts → src/lib/dmDerivedState.ts (no move)
- src/constants/* → src/lib/constants/* (or stay in src/constants if preferred)
- src/schemas/* → src/data/schemas/* (or keep if used broadly)
- src/types/* → src/types/* (no move)
