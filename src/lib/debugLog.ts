/**
 * Debug logging utility for Quest Family app.
 * Logs are only output in development mode.
 * 
 * Usage:
 *   debugLog('rewards', 'Showing scene celebration', { sceneId, rewards });
 *   debugLog('phase', 'Phase changed', { from: oldPhase, to: newPhase });
 */

const DEBUG_ENABLED = import.meta.env.DEV;

type LogCategory = 'rewards' | 'phase' | 'session' | 'adventure' | 'sync' | 'error';

const categoryColors: Record<LogCategory, string> = {
  rewards: '#22c55e',   // green
  phase: '#3b82f6',     // blue
  session: '#a855f7',   // purple
  adventure: '#f59e0b', // amber
  sync: '#06b6d4',      // cyan
  error: '#ef4444',     // red
};

export function debugLog(
  category: LogCategory,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!DEBUG_ENABLED) return;

  const color = categoryColors[category] || '#6b7280';
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(
    `%c[${category.toUpperCase()}]%c ${timestamp} - ${message}`,
    `color: ${color}; font-weight: bold;`,
    'color: inherit;',
    data ?? ''
  );
}

export function debugError(message: string, error: unknown): void {
  if (!DEBUG_ENABLED) return;
  
  console.error(`[ERROR] ${message}`, error);
}
