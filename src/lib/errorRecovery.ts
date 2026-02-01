const BACKOFF_MS = [1000, 2000, 4000, 8000];

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('fetch') || m.includes('network') || m.includes('timeout')) return true;
    if (m.includes('connection') || m.includes('failed')) return true;
  }
  return false;
}

/**
 * Retry a promise-returning function with exponential backoff.
 * Only retries on network-like errors.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < maxRetries && isRetryableError(e)) {
        const delay = BACKOFF_MS[Math.min(i, BACKOFF_MS.length - 1)];
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

const SESSION_STORAGE_KEY = 'quest-family-session';

export function saveSessionToStorage(session: unknown): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function getSessionFromStorage<T>(): T | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearSessionFromStorage(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Convert error to user-friendly message
 */
export function formatError(err: unknown): string {
  if (!err) return 'An unknown error occurred';

  // Get message from Error instance or object with message property (e.g., Supabase PostgrestError)
  const message = err instanceof Error
    ? err.message
    : (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string')
      ? (err as { message: string }).message
      : null;

  if (message) {
    const m = message.toLowerCase();
    if (m.includes('network') || m.includes('fetch') || m.includes('connection')) {
      return 'Connection issue. Please check your internet and try again.';
    }
    if (m.includes('not found') || m.includes('room code')) {
      return 'Room code not found. Please check and try again.';
    }
    if (m.includes('session')) {
      return 'Session error. Please create a new session.';
    }
    if (m.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return message || 'Something went wrong. Please try again.';
  }
  return String(err) || 'An unknown error occurred';
}
