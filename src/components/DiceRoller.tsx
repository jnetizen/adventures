import { useState } from 'react';

interface DiceRollerProps {
  onRoll: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 20;

export default function DiceRoller({
  onRoll,
  disabled = false,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
}: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [lastValue, setLastValue] = useState<number | null>(null);

  const handleRoll = () => {
    if (disabled || rolling) return;
    setRolling(true);
    setLastValue(null);

    const duration = 600;
    const steps = 8;
    const stepMs = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        clearInterval(interval);
        const final = min + Math.floor(Math.random() * (max - min + 1));
        setLastValue(final);
        setRolling(false);
        onRoll(final);
      }
    }, stepMs);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleRoll}
        disabled={disabled || rolling}
        className="flex items-center justify-center w-14 h-14 rounded-xl bg-amber-100 border-2 border-amber-300 text-2xl hover:bg-amber-200 hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        title="Roll dice"
        aria-label="Roll dice"
      >
        <span
          className={`inline-block ${rolling ? 'animate-dice-spin' : ''}`}
          aria-hidden
        >
          🎲
        </span>
      </button>
      {(rolling || lastValue !== null) && (
        <div className="text-center min-h-[1.5rem]">
          {rolling ? (
            <span className="text-sm text-gray-500">Rolling…</span>
          ) : (
            <span className="text-lg font-bold text-amber-800">
              {lastValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
