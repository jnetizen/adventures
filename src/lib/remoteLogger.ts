import { supabase } from './supabase';

interface LogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  url: string;
  userAgent: string;
  sessionId?: string;
  timestamp: string;
}

// Buffer logs and send in batches to reduce requests
let logBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 5000; // Send logs every 5 seconds
const MAX_BUFFER_SIZE = 20; // Or when buffer reaches 20 entries

// Get or create a device ID for tracking across sessions
function getDeviceId(): string {
  let deviceId = localStorage.getItem('debug_device_id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('debug_device_id', deviceId);
  }
  return deviceId;
}

// Current session ID (set by the app when a game session starts)
let currentSessionId: string | undefined;

export function setSessionId(sessionId: string | undefined) {
  currentSessionId = sessionId;
}

async function flushLogs() {
  if (logBuffer.length === 0) return;

  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    const deviceId = getDeviceId();

    // Send to Supabase
    const { error } = await supabase.from('debug_logs').insert(
      logsToSend.map(log => ({
        level: log.level,
        message: log.message,
        context: log.context,
        url: log.url,
        user_agent: log.userAgent,
        session_id: log.sessionId,
        device_id: deviceId,
        created_at: log.timestamp,
      }))
    );

    if (error) {
      // Don't use console.error here to avoid infinite loop
      // Just silently fail - we don't want logging to break the app
    }
  } catch {
    // Silently fail - logging should never break the app
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, FLUSH_INTERVAL_MS);
}

function addLog(level: LogEntry['level'], message: string, context?: Record<string, unknown>) {
  // Skip logs that are just noise
  if (message.includes('[vite]') || message.includes('HMR')) return;

  logBuffer.push({
    level,
    message: message.substring(0, 2000), // Limit message length
    context,
    url: window.location.href,
    userAgent: navigator.userAgent,
    sessionId: currentSessionId,
    timestamp: new Date().toISOString(),
  });

  // Flush immediately if buffer is full or if it's an error
  if (logBuffer.length >= MAX_BUFFER_SIZE || level === 'error') {
    flushLogs();
  } else {
    scheduleFlush();
  }
}

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/**
 * Initialize remote logging by intercepting console methods.
 * Call this once at app startup.
 */
export function initRemoteLogger() {
  // Only capture warnings and errors by default to reduce noise
  // Logs are only captured if they contain specific prefixes we care about

  console.log = (...args) => {
    originalConsole.log(...args);

    // Only capture logs with our debug prefixes
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      message.includes('[SeekerLens]') ||
      message.includes('[SUBSCRIPTION]') ||
      message.includes('[CUTSCENE]') ||
      message.includes('[PUZZLE]') ||
      message.includes('[RECOVERY]') ||
      message.includes('[PHASE]')
    ) {
      addLog('log', message);
    }
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    addLog('warn', message);
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    addLog('error', message);
  };

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    addLog('error', `Unhandled error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', `Unhandled promise rejection: ${event.reason}`);
  });

  // Flush logs before page unload
  window.addEventListener('beforeunload', () => {
    flushLogs();
  });

  // Flush when page becomes hidden (mobile tab switch, screen lock)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushLogs();
    }
  });

  originalConsole.log('[RemoteLogger] Initialized - errors and key logs will be captured automatically');
}
