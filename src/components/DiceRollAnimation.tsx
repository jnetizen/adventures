import { useState, useEffect, useRef } from 'react';

interface DiceRollAnimationProps {
  /** The child's name to display */
  kidName: string;
  /** The dice value rolled */
  roll: number;
  /** Max dice value (6, 10, 12, or 20) */
  diceMax: number;
  /** Callback when animation finishes */
  onComplete: () => void;
}

type AnimationPhase = 'rolling' | 'landed' | 'celebrating' | 'done';

/** Sparkle particle for success effect */
function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute text-2xl animate-sparkle-burst"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}ms`,
      }}
    >
      ✨
    </div>
  );
}

/** Simple d20 shape using CSS */
function DiceIcon({ spinning }: { spinning: boolean }) {
  return (
    <div
      className={`
        w-32 h-32 flex items-center justify-center
        bg-gradient-to-br from-amber-400 to-amber-600
        rounded-2xl shadow-2xl border-4 border-amber-300
        ${spinning ? 'animate-dice-bounce-spin' : ''}
      `}
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      }}
    >
      <span className="text-4xl">🎲</span>
    </div>
  );
}

/**
 * Full-screen dice roll animation overlay.
 * Shows when a roll is submitted, displays the result with success/fail effects.
 * Duration: ~2 seconds total.
 */
export default function DiceRollAnimation({
  kidName,
  roll,
  diceMax,
  onComplete,
}: DiceRollAnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('rolling');

  // Use a ref to store onComplete so the effect doesn't restart when the callback changes
  // This prevents the animation from restarting on every parent re-render (e.g., from polling)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Success threshold: roll >= half of max dice value
  const isSuccess = roll >= Math.ceil(diceMax / 2);

  // Animation timeline - runs once on mount, uses ref for callback
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Rolling (0-800ms)
    // Already in 'rolling' phase

    // Phase 2: Landed - show number (800ms)
    timers.push(
      setTimeout(() => {
        setPhase('landed');
      }, 800)
    );

    // Phase 3: Celebrating - show success/fail effect (1000ms)
    timers.push(
      setTimeout(() => {
        setPhase('celebrating');
      }, 1000)
    );

    // Phase 4: Done - fade out and complete (1800ms)
    timers.push(
      setTimeout(() => {
        setPhase('done');
      }, 1800)
    );

    // Call onComplete after fade out (2000ms)
    timers.push(
      setTimeout(() => {
        onCompleteRef.current();
      }, 2000)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []); // Empty deps - animation runs once on mount

  return (
    <div
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        bg-black/70 backdrop-blur-sm
        ${phase === 'done' ? 'animate-dice-fade-out' : 'animate-fade-in'}
      `}
      role="status"
      aria-live="polite"
      aria-label={`${kidName} rolled ${roll}`}
    >
      {/* Kid's name announcement */}
      <div className="mb-8 text-center">
        <p className="text-3xl font-bold text-white drop-shadow-lg animate-text-pop">
          {kidName} rolled...
        </p>
      </div>

      {/* Dice / Number display */}
      <div className="relative">
        {phase === 'rolling' && <DiceIcon spinning={true} />}

        {(phase === 'landed' || phase === 'celebrating' || phase === 'done') && (
          <div
            className={`
              relative flex items-center justify-center
              w-48 h-48 rounded-full
              ${isSuccess ? 'bg-green-500' : 'bg-orange-500'}
              ${phase === 'celebrating' && isSuccess ? 'animate-success-glow' : ''}
              ${phase === 'celebrating' && !isSuccess ? 'animate-fail-wobble' : ''}
            `}
          >
            {/* The big number */}
            <span
              className={`
                text-[120px] font-black text-white drop-shadow-2xl
                ${phase === 'landed' ? 'animate-number-reveal' : ''}
              `}
              style={{ lineHeight: 1 }}
            >
              {roll}
            </span>

            {/* Exclamation for emphasis */}
            <span
              className="absolute -right-4 -top-4 text-5xl animate-text-pop"
              style={{ animationDelay: '200ms' }}
            >
              {isSuccess ? '!' : ''}
            </span>
          </div>
        )}

        {/* Success sparkles */}
        {phase === 'celebrating' && isSuccess && (
          <>
            <Sparkle delay={0} x={10} y={20} />
            <Sparkle delay={100} x={85} y={15} />
            <Sparkle delay={200} x={5} y={70} />
            <Sparkle delay={150} x={90} y={65} />
            <Sparkle delay={250} x={50} y={-10} />
            <Sparkle delay={300} x={50} y={100} />
          </>
        )}
      </div>

      {/* Success/Fail text */}
      {phase === 'celebrating' && (
        <div className="mt-6 animate-text-pop" style={{ animationDelay: '100ms' }}>
          {isSuccess ? (
            <p className="text-2xl font-bold text-green-300 drop-shadow-lg">
              Nice roll!
            </p>
          ) : (
            <p className="text-2xl font-bold text-orange-300 drop-shadow-lg">
              Uh oh...
            </p>
          )}
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only">
        {kidName} rolled {roll}. {isSuccess ? 'Success!' : 'Try again!'}
      </div>
    </div>
  );
}
