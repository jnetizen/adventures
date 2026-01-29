# Architecture Overview

This document describes the codebase architecture, key patterns, and guidelines for maintaining consistency.

## Directory Structure

```
src/
├── components/         # Reusable UI components
├── constants/          # Centralized constants (game phases, operation types, etc.)
│   └── game.ts         # GAME_PHASES, OPERATION_TYPES, CONNECTION_STATUS
├── data/               # Static data files
│   └── adventures/     # Adventure JSON files
├── hooks/              # Custom React hooks (extracted from pages)
│   ├── index.ts        # Barrel export
│   ├── useAdventureLoader.ts
│   ├── useOfflineSync.ts
│   ├── useSessionPersistence.ts
│   ├── useSessionRecovery.ts
│   └── useSessionSubscription.ts
├── lib/                # Core business logic and utilities
│   ├── adventures.ts   # Adventure loading and game logic
│   ├── gameState.ts    # Supabase session operations
│   ├── offlineStorage.ts # Offline queue management
│   ├── result.ts       # Result<T> type for error handling
│   └── ...
├── pages/              # Page components (DMPage, PlayPage, etc.)
├── schemas/            # Zod schemas for runtime validation
│   ├── adventure.ts    # Adventure, Scene, Character schemas
│   └── game.ts         # GameSession, PendingOperation schemas
└── types/              # TypeScript type definitions
    ├── adventure.ts    # Adventure types (re-exports from schemas)
    └── game.ts         # Game session types (re-exports from constants)
```

## Key Patterns

### 1. Constants Over Magic Strings

All string literals that represent state values are defined in `src/constants/game.ts`:

```typescript
// DO: Use constants
import { GAME_PHASES, OPERATION_TYPES, CONNECTION_STATUS } from '../constants/game';

if (session.phase === GAME_PHASES.PLAYING) { ... }
type: OPERATION_TYPES.START_ADVENTURE

// DON'T: Use magic strings
if (session.phase === 'playing') { ... }  // BAD
type: 'startAdventure'  // BAD
```

**Why**: Typos become compile errors. Refactoring is easier. IDE autocomplete works.

### 2. Zod Validation at Boundaries

Use Zod schemas to validate data from external sources:

```typescript
import { parseGameSession, parsePendingOperations } from '../schemas/game';

// Validating Supabase response
const validatedSession = parseGameSession(payload.new);
if (validatedSession) {
  setSession(validatedSession);
}

// Validating localStorage
const operations = parsePendingOperations(JSON.parse(raw));
```

**Where to validate**:
- Supabase realtime payloads (useSessionSubscription)
- localStorage reads (offlineStorage.ts)
- Adventure JSON loading (adventures.ts)

**Why**: Catches data corruption early. Prevents runtime crashes from invalid data.

### 3. Custom Hooks for Shared Logic

Common patterns are extracted into custom hooks in `src/hooks/`:

| Hook | Purpose | Replaces |
|------|---------|----------|
| `useSessionPersistence` | Save/clear session to localStorage | DMPage:47-53, PlayPage:46-52 |
| `useOfflineSync` | Track offline status, sync when online | DMPage:56-83, PlayPage:55-82 |
| `useAdventureLoader` | Load adventure by ID | DMPage:106-120, PlayPage:85-99 |
| `useSessionSubscription` | Subscribe to Supabase realtime | DMPage:138-169, PlayPage:146-177 |
| `useSessionRecovery` | Recover session from localStorage | DMPage:472-491, PlayPage:201-220 |

**Why**: Eliminates duplicate code. Single source of truth for logic. Easier testing.

### 4. Result Type for Error Handling

Use `Result<T>` from `src/lib/result.ts` for operations that can fail:

```typescript
import { success, failure, type Result } from '../lib/result';

function parseData(raw: string): Result<Data> {
  try {
    return success(JSON.parse(raw));
  } catch (e) {
    return failure(e instanceof Error ? e : new Error('Parse failed'));
  }
}

// Usage
const result = parseData(input);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

**Why**: Explicit error handling. No try-catch needed at every call site.

### 5. Exhaustive Switch for Operation Types

When switching on operation types, use the `assertNever` pattern:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${x}`);
}

switch (op.type) {
  case OPERATION_TYPES.START_ADVENTURE: ...
  case OPERATION_TYPES.START_SCENE: ...
  // ... all cases
  default:
    assertNever(op);  // TypeScript error if any case is missing
}
```

**Why**: Adding a new operation type will cause a compile error until all switches are updated.

## Import Conventions

```typescript
// 1. React imports
import { useState, useEffect, useCallback } from 'react';

// 2. Third-party imports
import { z } from 'zod';

// 3. Internal libraries (lib/)
import { createSession, startAdventure } from '../lib/gameState';

// 4. Constants
import { GAME_PHASES, OPERATION_TYPES, CONNECTION_STATUS } from '../constants/game';

// 5. Custom hooks
import { useSessionPersistence, useOfflineSync } from '../hooks';

// 6. Schemas
import { parseGameSession } from '../schemas/game';

// 7. Types
import type { GameSession, Player } from '../types/game';

// 8. Components
import ConnectionStatus from '../components/ConnectionStatus';
```

## DO NOT

These patterns exist for important reasons. Do not undo them:

1. **DO NOT** use magic strings for game phases, operation types, or connection status.
   Use the constants from `src/constants/game.ts`.

2. **DO NOT** duplicate hook logic in page components.
   If you find yourself copying code, extract it into a hook.

3. **DO NOT** skip Zod validation for external data.
   Always validate Supabase responses and localStorage reads.

4. **DO NOT** use `any` type casts for Supabase payloads.
   Use `parseGameSession()` or similar validation functions.

5. **DO NOT** add operation types without updating the exhaustive switch in `gameState.ts`.
   TypeScript will error if you do.

6. **DO NOT** remove the `isOffline` and `syncing` dependencies from `useSessionSubscription`.
   This fixes a stale closure bug.

## Adding New Features

### Adding a New Game Phase

1. Add to `GAME_PHASES` in `src/constants/game.ts`
2. Update `GamePhaseSchema` in `src/schemas/game.ts`
3. Handle in UI components (DMPage, PlayPage)

### Adding a New Operation Type

1. Add to `OPERATION_TYPES` in `src/constants/game.ts`
2. Create data schema in `src/schemas/game.ts`
3. Add to `PendingOperationSchema` discriminated union
4. Add case in `syncPendingOperations()` switch (will error until you do)
5. Use in the function that queues the operation

### Adding a New Custom Hook

1. Create file in `src/hooks/`
2. Export from `src/hooks/index.ts`
3. Document purpose in this file's hook table
