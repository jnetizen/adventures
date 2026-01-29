/**
 * Game Constants
 *
 * Centralized constants for game phases, operation types, and connection status.
 * Import from this file instead of using magic strings throughout the codebase.
 */

/**
 * Game phase constants.
 * Represents the current state of a game session.
 */
export const GAME_PHASES = {
  SETUP: 'setup',
  PROLOGUE: 'prologue',
  PLAYING: 'playing',
  COMPLETE: 'complete',
  PAUSED: 'paused',
} as const;

export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES];

/**
 * Operation types for offline queue.
 * Each operation that can be queued for sync when offline.
 */
export const OPERATION_TYPES = {
  CREATE_SESSION: 'createSession',
  START_ADVENTURE: 'startAdventure',
  START_SCENE: 'startScene',
  SUBMIT_CHOICE: 'submitChoice',
  ADVANCE_SCENE: 'advanceScene',
  SUBMIT_FEEDBACK: 'submitFeedback',
  RESET_SESSION: 'resetSession',
  SHOW_CUTSCENE: 'showCutscene',
  DISMISS_CUTSCENE: 'dismissCutscene',
  COLLECT_REWARD: 'collectReward',
} as const;

export type OperationType = (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

/**
 * All valid operation type values as an array.
 * Useful for validation and exhaustive checks.
 */
export const OPERATION_TYPE_VALUES = Object.values(OPERATION_TYPES) as OperationType[];

/**
 * Connection status constants.
 * Represents the current connection state of the app.
 */
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  OFFLINE: 'offline',
  SYNCING: 'syncing',
} as const;

export type ConnectionStatusType = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];
