import { useState, useCallback, useRef, useEffect } from 'react';
import type { ARCatchPuzzleInstructions } from '../types/adventure';

interface ARCatchPuzzleProps {
  instructions: ARCatchPuzzleInstructions;
  onComplete: (success: boolean) => void;
}

/**
 * AR Catch puzzle - catch a flying object multiple times.
 * The object moves around the screen playfully, getting faster with each catch.
 * Kid-friendly: very catchable, with fun feedback.
 */
export default function ARCatchPuzzle({ instructions, onComplete }: ARCatchPuzzleProps) {
  const completedRef = useRef(false);
  const [catches, setCatches] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isHiding, setIsHiding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const animationRef = useRef<number | null>(null);
  const lastMoveTime = useRef(Date.now());

  const { targetObject, arBehavior, catchFeedback, hints } = instructions;
  const catchesRequired = arBehavior?.catchesRequired || 3;

  // Movement speed increases with each catch
  const getSpeed = useCallback(() => {
    const baseSpeed = 0.5;
    return baseSpeed + catches * 0.3;
  }, [catches]);

  // Animate the object moving around
  useEffect(() => {
    if (isComplete || isHiding) return;

    const targetRef = { x: Math.random() * 70 + 15, y: Math.random() * 60 + 20 };
    let currentPos = { ...position };

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastMoveTime.current) / 1000;
      lastMoveTime.current = now;

      // Move toward target
      const dx = targetRef.x - currentPos.x;
      const dy = targetRef.y - currentPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        // Pick new target
        targetRef.x = Math.random() * 70 + 15;
        targetRef.y = Math.random() * 60 + 20;
      } else {
        const speed = getSpeed() * 20 * delta;
        currentPos.x += (dx / dist) * speed;
        currentPos.y += (dy / dist) * speed;
        setPosition({ ...currentPos });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [catches, isComplete, isHiding, getSpeed]);

  // Occasionally hide after first catch
  useEffect(() => {
    if (catches === 0 || isComplete) return;

    const hideDelay = catches === 1 ? 5000 : catches === 2 ? 3000 : 2000;

    const hideTimer = setTimeout(() => {
      if (!completedRef.current && !isComplete) {
        setIsHiding(true);
        const hideTime = catches * 500 + 500;
        setTimeout(() => {
          setIsHiding(false);
          // Reappear at random position
          setPosition({
            x: Math.random() * 70 + 15,
            y: Math.random() * 60 + 20,
          });
        }, hideTime);
      }
    }, hideDelay);

    return () => clearTimeout(hideTimer);
  }, [catches, isComplete]);

  // Handle hints timing
  useEffect(() => {
    if (!hints || hints.length === 0 || isComplete) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    hints.forEach((hint, index) => {
      const timer = setTimeout(() => {
        if (!completedRef.current) {
          setHintIndex(index);
        }
      }, hint.delaySeconds * 1000);
      timers.push(timer);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [hints, isComplete]);

  // Handle catch
  const handleCatch = useCallback(() => {
    if (isHiding || isComplete || completedRef.current) return;

    const newCatches = catches + 1;
    setCatches(newCatches);

    // Show feedback
    const fb = catchFeedback?.find(f => f.catchNumber === newCatches);
    setFeedback(fb?.text || `Catch ${newCatches}!`);

    // Move to new position immediately
    setPosition({
      x: Math.random() * 70 + 15,
      y: Math.random() * 60 + 20,
    });

    if (newCatches >= catchesRequired) {
      // Victory!
      setIsComplete(true);
      setTimeout(() => {
        completedRef.current = true;
        onComplete(true);
      }, 2500);
    } else {
      // Brief hide and reappear
      setIsHiding(true);
      setTimeout(() => {
        setIsHiding(false);
        setFeedback(null);
      }, 800);
    }
  }, [catches, isHiding, isComplete, catchesRequired, catchFeedback, onComplete]);

  // Auto-complete if struggling
  useEffect(() => {
    if (isComplete || completedRef.current) return;

    const helpTimer = setTimeout(() => {
      if (!completedRef.current && !isComplete) {
        setFeedback("The key lands in your hands!");
        setIsComplete(true);
        setCatches(catchesRequired);
        setTimeout(() => {
          completedRef.current = true;
          onComplete(true);
        }, 2000);
      }
    }, 45000); // After 45 seconds, auto-succeed

    return () => clearTimeout(helpTimer);
  }, [isComplete, catchesRequired, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-800 flex flex-col items-center overflow-hidden">
      {/* Misty overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute w-full h-full bg-gradient-to-t from-white/20 to-transparent animate-pulse" />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mt-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {isComplete ? 'Caught!' : 'Catch the Key!'}
        </h2>
        <p className="text-slate-300 text-lg">
          {catches} / {catchesRequired}
        </p>
      </div>

      {/* Progress dots */}
      <div className="relative z-10 flex gap-3 mt-4">
        {[...Array(catchesRequired)].map((_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full transition-all duration-300 ${
              i < catches
                ? 'bg-yellow-400 scale-110 shadow-lg shadow-yellow-400/50'
                : 'bg-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`relative z-10 mt-4 px-6 py-3 rounded-full text-xl font-bold ${
          isComplete ? 'bg-green-500 text-white animate-bounce' : 'bg-yellow-400 text-yellow-900'
        }`}>
          {feedback}
        </div>
      )}

      {/* Game area */}
      <div className="relative flex-1 w-full">
        {/* Flying target */}
        {!isHiding && (
          <button
            onClick={handleCatch}
            className={`absolute transition-all duration-300 ${
              isComplete
                ? 'scale-150 animate-pulse'
                : 'hover:scale-110 active:scale-90 cursor-pointer'
            }`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`relative ${!isComplete && 'animate-flutter'}`}>
              {targetObject.imageUrl ? (
                <img
                  src={targetObject.imageUrl}
                  alt={targetObject.name}
                  className="w-24 h-24 object-contain drop-shadow-lg"
                  style={{
                    filter: 'drop-shadow(0 0 15px gold)',
                  }}
                />
              ) : (
                <span className="text-7xl">🔑</span>
              )}
              {/* Wings effect */}
              {!isComplete && (
                <>
                  <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-3xl animate-wing-left">
                    🪶
                  </span>
                  <span className="absolute -right-4 top-1/2 -translate-y-1/2 text-3xl animate-wing-right">
                    🪶
                  </span>
                </>
              )}
            </div>
          </button>
        )}

        {/* Hiding indicator */}
        {isHiding && !isComplete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-slate-400 text-xl animate-pulse">
              Where did it go? 👀
            </p>
          </div>
        )}
      </div>

      {/* Hints */}
      {hintIndex >= 0 && hints && !isComplete && (
        <div className="absolute bottom-24 left-4 right-4 text-center z-10">
          <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white">
            💡 {hints[hintIndex].text}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-slate-300 text-sm">
          {!isComplete && 'Tap the key to catch it!'}
        </p>
      </div>

      {/* Success celebration */}
      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">🎉</div>
            <p className="text-4xl font-bold text-white">Got it!</p>
          </div>
        </div>
      )}

      {/* Sparkle particles when catching */}
      {feedback && !isComplete && (
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-sparkle-burst pointer-events-none"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                '--angle': `${i * 45}deg`,
              } as React.CSSProperties}
            >
              ✨
            </div>
          ))}
        </>
      )}

      {/* Add CSS for animations */}
      <style>{`
        @keyframes flutter {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        .animate-flutter {
          animation: flutter 0.5s ease-in-out infinite;
        }
        @keyframes wing-left {
          0%, 100% { transform: translateY(-50%) rotate(-20deg); }
          50% { transform: translateY(-50%) rotate(-40deg); }
        }
        @keyframes wing-right {
          0%, 100% { transform: translateY(-50%) rotate(20deg) scaleX(-1); }
          50% { transform: translateY(-50%) rotate(40deg) scaleX(-1); }
        }
        .animate-wing-left {
          animation: wing-left 0.3s ease-in-out infinite;
        }
        .animate-wing-right {
          animation: wing-right 0.3s ease-in-out infinite;
        }
        @keyframes sparkle-burst {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% {
            transform: translate(-50%, -50%) translateX(calc(cos(var(--angle)) * 60px)) translateY(calc(sin(var(--angle)) * 60px)) scale(0);
            opacity: 0;
          }
        }
        .animate-sparkle-burst {
          animation: sparkle-burst 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
