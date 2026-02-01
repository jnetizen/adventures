import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}

const MAX_LOGS = 50;

/**
 * On-screen debug panel for mobile testing without needing to connect to a computer.
 *
 * - Triple-tap anywhere to toggle the panel
 * - Shows recent console logs, warnings, and errors
 * - Filter by log type
 * - Clear logs button
 */
export default function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: LogEntry['type'], args: unknown[]) => {
      const message = args
        .map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(' ');

      setLogs(prev => {
        const newLogs = [...prev, { type, message, timestamp: new Date() }];
        // Keep only last MAX_LOGS entries
        return newLogs.slice(-MAX_LOGS);
      });
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && isVisible) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isVisible]);

  // Triple-tap detection
  useEffect(() => {
    const handleTap = () => {
      tapCountRef.current += 1;

      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }

      if (tapCountRef.current >= 3) {
        setIsVisible(prev => !prev);
        tapCountRef.current = 0;
      } else {
        tapTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
        }, 500); // Reset if no tap within 500ms
      }
    };

    document.addEventListener('click', handleTap);
    return () => document.removeEventListener('click', handleTap);
  }, []);

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.type === filter);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 text-white font-mono text-xs"
      style={{ maxHeight: '50vh' }}
      onClick={(e) => e.stopPropagation()} // Prevent triple-tap from closing when clicking inside
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-900">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded ${filter === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('log')}
            className={`px-2 py-1 rounded ${filter === 'log' ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            Log
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`px-2 py-1 rounded ${filter === 'warn' ? 'bg-yellow-600' : 'bg-gray-700'}`}
          >
            Warn
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-2 py-1 rounded ${filter === 'error' ? 'bg-red-600' : 'bg-gray-700'}`}
          >
            Error
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLogs([])}
            className="px-2 py-1 rounded bg-gray-700"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-2 py-1 rounded bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Logs */}
      <div
        ref={logContainerRef}
        className="overflow-y-auto p-2"
        style={{ maxHeight: 'calc(50vh - 44px)' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No logs yet</div>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} className={`${getLogColor(log.type)} py-1 border-b border-gray-800`}>
              <span className="text-gray-500">[{formatTime(log.timestamp)}]</span>{' '}
              <span className="whitespace-pre-wrap break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Hint */}
      <div className="text-center text-gray-600 text-xs py-1 border-t border-gray-700">
        Triple-tap anywhere to hide
      </div>
    </div>
  );
}
