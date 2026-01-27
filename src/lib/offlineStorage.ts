import type { Adventure } from '../types/adventure';

const ADVENTURE_CACHE_PREFIX = 'adventure-cache-';
const OPERATIONS_QUEUE_KEY = 'offline-operations-queue';

export interface PendingOperation {
  id: string;
  type: 'createSession' | 'startAdventure' | 'startScene' | 'submitChoice' | 'advanceScene' | 'submitFeedback' | 'resetSession';
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
 * Save operation to offline queue
 */
export async function saveOperationToQueue(operation: PendingOperation): Promise<void> {
  try {
    const queue = getPendingOperationsSync();
    queue.push(operation);
    localStorage.setItem(OPERATIONS_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to queue operation:', e);
  }
}

/**
 * Get all pending operations (sync version for queue management)
 */
function getPendingOperationsSync(): PendingOperation[] {
  try {
    const raw = localStorage.getItem(OPERATIONS_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingOperation[];
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
