import { useEffect, useMemo, useRef, useState } from 'react';
import type { Reward } from '../types/adventure';
import PlaceholderImage from './PlaceholderImage';

/** Deterministic "random" positions for confetti (stable across rerenders). */
function confettiPositions(n: number): { left: string; top: string }[] {
  const out: { left: string; top: string }[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i * 0.38197) % 1;
    const q = (i * 0.61803) % 1;
    out.push({ left: `${p * 100}%`, top: `${q * 100}%` });
  }
  return out;
}

/** Component for a single reward image with error fallback */
function RewardImage({ reward }: { reward: Reward }) {
  const [error, setError] = useState(false);

  if (!reward.imageUrl || error) {
    return (
      <PlaceholderImage
        variant="character"
        label={reward.name}
        className="w-10 h-10 flex-shrink-0"
      />
    );
  }

  return (
    <img
      src={reward.imageUrl}
      alt={reward.name}
      className="w-10 h-10 object-contain rounded flex-shrink-0"
      onError={() => setError(true)}
    />
  );
}

interface RewardCelebrationProps {
  rewards: Reward[];
  onClose: () => void;
  variant: 'scene' | 'ending';
}

const AUTO_DISMISS_MS = 4500;

export default function RewardCelebration({ rewards, onClose, variant }: RewardCelebrationProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const isEnding = variant === 'ending';
  const ariaLabel = isEnding ? 'Adventure complete - rewards earned' : 'Scene rewards earned';
  const positions = useMemo(() => confettiPositions(24), []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isEnding ? 'bg-gradient-to-br from-amber-100 to-orange-100' : 'bg-black/40 backdrop-blur-sm'
      }`}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="true"
    >
      {/* Simple CSS confetti-like dots */}
      {!isEnding && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {positions.map((pos, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: pos.left,
                top: pos.top,
                backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#eab308'][i % 5],
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`relative rounded-2xl shadow-2xl border-2 ${
          isEnding
            ? 'bg-white border-amber-300 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto'
            : 'bg-white border-amber-200 max-w-sm w-full mx-4'
        }`}
      >
        <div className="p-6 text-center">
          <p className="text-2xl mb-2">🎁</p>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isEnding ? 'Adventure complete!' : 'Scene rewards!'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {isEnding ? 'You did it!' : 'Great work!'}
          </p>
          <ul className="space-y-3 text-left">
            {rewards.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-100"
              >
                <RewardImage reward={r} />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-gray-900">{r.name}</span>
                  {r.type && (
                    <span className="ml-2 text-xs text-amber-700 uppercase">{r.type}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-2.5 px-4 rounded-lg font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
