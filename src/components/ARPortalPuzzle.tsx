import { useState, useCallback, useRef, useEffect } from 'react';
import type { ARPortalPuzzleInstructions } from '../types/adventure';

interface ARPortalPuzzleProps {
  instructions: ARPortalPuzzleInstructions;
  onComplete: (success: boolean) => void;
}

/**
 * AR Portal Peek puzzle - simulates looking through a magical portal to find a hidden object.
 * Player drags/moves their view around to search for the target.
 * Kid-friendly: always succeeds, with hints and glowing effects.
 */
export default function ARPortalPuzzle({ instructions, onComplete }: ARPortalPuzzleProps) {
  const completedRef = useRef(false);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [targetFound, setTargetFound] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  const { targetObject, hints, tapPrompt } = instructions;

  // Target position - placed in the "upper-left" area as suggested by the hints
  const targetPosition = { x: -180, y: -150 };

  // Calculate distance to target for glow intensity
  const distanceToTarget = Math.sqrt(
    Math.pow(viewOffset.x - targetPosition.x, 2) +
    Math.pow(viewOffset.y - targetPosition.y, 2)
  );
  const maxDistance = 400;
  const glowIntensity = Math.max(0, 1 - distanceToTarget / maxDistance);

  // Show target when close enough
  useEffect(() => {
    if (distanceToTarget < 150 && !showTarget) {
      setShowTarget(true);
    }
  }, [distanceToTarget, showTarget]);

  // Handle hints timing
  useEffect(() => {
    if (!hints || hints.length === 0 || targetFound) return;

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
  }, [hints, targetFound]);

  // Touch/mouse handlers for dragging the view
  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true;
    lastPosition.current = { x: clientX, y: clientY };
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current || targetFound) return;

    const deltaX = clientX - lastPosition.current.x;
    const deltaY = clientY - lastPosition.current.y;

    setViewOffset(prev => ({
      x: Math.max(-300, Math.min(300, prev.x + deltaX * 0.5)),
      y: Math.max(-250, Math.min(250, prev.y + deltaY * 0.5)),
    }));

    lastPosition.current = { x: clientX, y: clientY };
  }, [targetFound]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Handle target tap
  const handleTargetTap = useCallback(() => {
    if (targetFound || completedRef.current) return;

    setTargetFound(true);
    setTimeout(() => {
      setIsComplete(true);
      setTimeout(() => {
        completedRef.current = true;
        onComplete(true);
      }, 2000);
    }, 1000);
  }, [targetFound, onComplete]);

  // Floating objects for the portal dimension
  const floatingObjects = [
    { emoji: '📚', x: -100, y: -80, delay: 0 },
    { emoji: '📖', x: 150, y: -120, delay: 0.5 },
    { emoji: '⭐', x: -200, y: 50, delay: 1 },
    { emoji: '✨', x: 80, y: 100, delay: 1.5 },
    { emoji: '📜', x: -50, y: 180, delay: 2 },
    { emoji: '🌟', x: 200, y: -50, delay: 0.3 },
    { emoji: '📕', x: -150, y: 120, delay: 0.8 },
    { emoji: '💫', x: 100, y: -180, delay: 1.2 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-0 right-0 text-center z-20">
        <h2 className="text-2xl font-bold text-white mb-1">
          {isComplete ? 'Found it!' : targetFound ? 'Got it!' : 'Look Through the Portal'}
        </h2>
        <p className="text-purple-200 text-sm">
          {!targetFound && 'Move around to search the dimension'}
        </p>
      </div>

      {/* Glow indicator */}
      {!targetFound && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-20 transition-all duration-300"
          style={{
            backgroundColor: `rgba(255, 215, 0, ${glowIntensity * 0.8})`,
            color: glowIntensity > 0.5 ? '#000' : '#fff',
            boxShadow: `0 0 ${glowIntensity * 30}px rgba(255, 215, 0, ${glowIntensity})`,
          }}
        >
          {glowIntensity > 0.7 ? '🔥 Very Hot!' : glowIntensity > 0.4 ? '🌡️ Getting Warmer!' : glowIntensity > 0.2 ? '❄️ Cold...' : '🧊 Very Cold...'}
        </div>
      )}

      {/* Portal frame */}
      <div
        ref={containerRef}
        className="relative w-80 h-80 rounded-full border-8 border-purple-400 shadow-2xl overflow-hidden cursor-move"
        style={{
          boxShadow: `0 0 60px rgba(147, 51, 234, 0.6), inset 0 0 60px rgba(88, 28, 135, 0.8)`,
        }}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        {/* Swirling portal background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-indigo-600"
          style={{
            transform: `translate(${viewOffset.x * 0.3}px, ${viewOffset.y * 0.3}px)`,
          }}
        >
          <div className="absolute inset-0 animate-spin-slow opacity-30">
            <div className="absolute inset-0 bg-gradient-conic from-purple-500 via-pink-500 to-purple-500" />
          </div>
        </div>

        {/* Floating objects layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`,
          }}
        >
          {floatingObjects.map((obj, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-float"
              style={{
                left: `calc(50% + ${obj.x}px)`,
                top: `calc(50% + ${obj.y}px)`,
                animationDelay: `${obj.delay}s`,
              }}
            >
              {obj.emoji}
            </div>
          ))}

          {/* Target object */}
          {showTarget && (
            <button
              onClick={handleTargetTap}
              disabled={targetFound}
              className={`absolute transition-all duration-500 ${
                targetFound
                  ? 'scale-150 animate-pulse'
                  : 'hover:scale-110 animate-float cursor-pointer'
              }`}
              style={{
                left: `calc(50% + ${targetPosition.x}px)`,
                top: `calc(50% + ${targetPosition.y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {targetObject.imageUrl ? (
                <img
                  src={targetObject.imageUrl}
                  alt={targetObject.name}
                  className="w-24 h-24 object-contain drop-shadow-lg"
                  style={{
                    filter: targetFound ? 'brightness(1.5)' : `drop-shadow(0 0 ${10 + glowIntensity * 20}px gold)`,
                  }}
                />
              ) : (
                <span className="text-6xl">🪶</span>
              )}
            </button>
          )}
        </div>

        {/* Portal edge glow */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 40px rgba(147, 51, 234, 0.8)',
          }}
        />
      </div>

      {/* Tap prompt */}
      {showTarget && !targetFound && (
        <div className="mt-6 px-6 py-3 bg-yellow-400 text-yellow-900 rounded-full font-bold text-lg animate-bounce">
          {tapPrompt || 'Tap to grab it!'}
        </div>
      )}

      {/* Hints */}
      {hintIndex >= 0 && hints && !targetFound && (
        <div className="absolute bottom-24 left-4 right-4 text-center">
          <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white">
            💡 {hints[hintIndex].text}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-purple-200 text-sm">
          {!targetFound ? 'Drag to look around the portal' : ''}
        </p>
      </div>

      {/* Success celebration */}
      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">✨</div>
            <p className="text-4xl font-bold text-white">Amazing!</p>
          </div>
        </div>
      )}

      {/* Add CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
