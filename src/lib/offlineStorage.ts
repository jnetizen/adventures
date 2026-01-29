import type { Adventure } from '../types/adventure';
import { type OperationType } from '../constants/game';
import { parsePendingOperations, type PendingOperation } from '../schemas/game';

const ADVENTURE_CACHE_PREFIX = 'adventure-cache-';
const OPERATIONS_QUEUE_KEY = 'offline-operations-queue';

// Re-export PendingOperation type from schemas for backward compatibility
export type { PendingOperation };

/**
 * Legacy PendingOperation interface for reference.
 * Now use the Zod schema type from schemas/game.ts instead.
 */
export interface LegacyPendingOperation {
  id: string;
  type: OperationType;
  sessionId: string;
  data: unknown;
  timestamp: string;
}

/**
 * Save adventure to cache (localStorage)
 */
export async function saveAdventureToCache(adventure: Adventure): Promise<void> {
  try {
    localStorage.setItem(`${ADVENTURE_CACHE_PREFIX}${adventure.id}`, JSON.stringify(adventure));
  } catch (e) {
    console.warn('Failed to cache adventure:', e);
  }
}

/**
 * Get cached adventure by ID
 */
export async function getCachedAdventure(id: string): Promise<Adventure | null> {
  try {
    const raw = localStorage.getItem(`${ADVENTURE_CACHE_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as Adventure;
  } catch {
    return null;
  }
}

/**
 * Get all cached adventure IDs
 */
export async function getAllCachedAdventureIds(): Promise<string[]> {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(ADVENTURE_CACHE_PREFIX)) {
        keys.push(key.replace(ADVENTURE_CACHE_PREFIX, ''));
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Save operation to offline queue.
 * Note: Uses LegacyPendingOperation to allow any operation shape to be saved,
 * validation happens on read via getPendingOperationsSync.
 */
export async function saveOperationToQueue(operation: LegacyPendingOperation): Promise<void> {
  try {
    // Read raw queue to preserve any operations (including those that might not validate)
    const raw = localStorage.getItem(OPERATIONS_QUEUE_KEY);
    const queue: unknown[] = raw ? JSON.parse(raw) : [];
    queue.push(operation);
    localStorage.setItem(OPERATIONS_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to queue operation:', e);
  }
}

/**
 * Get all pending operations (sync version for queue management).
 * Uses Zod validation to filter out invalid operations.
 */
function getPendingOperationsSync(): PendingOperation[] {
  try {
    const raw = localStorage.getItem(OPERATIONS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validate with Zod - filters out invalid operations
    return parsePendingOperations(parsed);
  } catch {
    return [];
  }
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  return getPendingOperationsSync();
}

/**
 * Remove operation from queue by ID
 */
export async function removeOperationFromQueue(operationId: string): Promise<void> {
  try {
    const queue = getPendingOperationsSync();
    const filtered = queue.filter((op) => op.id !== operationId);
    localStorage.setItem(OPERATIONS_QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove operation from queue:', e);
  }
}

/**
 * Clear all pending operations
 */
export async function clearPendingOperations(): Promise<void> {
  try {
    localStorage.removeItem(OPERATIONS_QUEUE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Subscribe to online/offline events
 */
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
