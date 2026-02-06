import { useState, useCallback, useMemo, useRef } from 'react';
import type { TapMatchPuzzleInstructions } from '../types/adventure';

interface TapMatchPuzzleProps {
  instructions: TapMatchPuzzleInstructions;
  onComplete: (success: boolean) => void;
}

interface GridItem {
  id: string;
  type: string;
  emoji: string;
  isTarget: boolean;
  found: boolean;
}

// Emoji mapping for item types
const ITEM_EMOJIS: Record<string, string> = {
  butterfly: '🦋',
  book: '📚',
  feather: '🪶',
  moon: '🌙',
  star: '⭐',
  flower: '🌸',
  heart: '💖',
  vent: '🕳️',
  pipe: '🔧',
  mouse: '🐭',
};

/**
 * Tap to Match puzzle - find all target items in a grid.
 * Designed to be very easy for young children (3-5 years old).
 */
export default function TapMatchPuzzle({ instructions, onComplete }: TapMatchPuzzleProps) {
  const completedRef = useRef(false);
  const { targetItems, distractorItems, grid, correctTapFeedback } = instructions;

  // Build grid items
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];

    // Add target items
    for (let i = 0; i < targetItems.count; i++) {
      items.push({
        id: `target-${i}`,
        type: targetItems.type,
        emoji: ITEM_EMOJIS[targetItems.type] || '❓',
        isTarget: true,
        found: false,
      });
    }

    // Add distractor items
    distractorItems.forEach((distractor, idx) => {
      for (let i = 0; i < distractor.count; i++) {
        items.push({
          id: `distractor-${idx}-${i}`,
          type: distractor.type,
          emoji: ITEM_EMOJIS[distractor.type] || '❓',
          isTarget: false,
          found: false,
        });
      }
    });

    // Shuffle the items
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }, [targetItems, distractorItems]);

  const [items, setItems] = useState<GridItem[]>(gridItems);
  const [foundCount, setFoundCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const encouragements = correctTapFeedback?.encouragement || ['Yay!', 'Great!', 'Awesome!', 'Found it!', 'Perfect!'];

  const handleTap = useCallback((item: GridItem) => {
    if (item.found || isComplete || completedRef.current) return;

    if (item.isTarget) {
      // Found a target!
      const newItems = items.map(i =>
        i.id === item.id ? { ...i, found: true } : i
      );
      setItems(newItems);

      const newFoundCount = foundCount + 1;
      setFoundCount(newFoundCount);

      // Show encouragement
      const encouragement = encouragements[Math.min(newFoundCount - 1, encouragements.length - 1)];
      setFeedback(encouragement);

      // Check if all found
      if (newFoundCount >= targetItems.count) {
        setIsComplete(true);
        setTimeout(() => {
          completedRef.current = true;
          onComplete(true);
        }, 2000);
      } else {
        // Clear feedback after a moment
        setTimeout(() => setFeedback(null), 1000);
      }
    } else {
      // Wrong item - wiggle it
      setWiggleId(item.id);
      setTimeout(() => setWiggleId(null), 500);
    }
  }, [items, foundCount, targetItems.count, encouragements, isComplete, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-purple-800 mb-2">
          {isComplete ? 'All Found!' : `Find the ${targetItems.type === 'butterfly' ? 'Butterflies' : targetItems.type}!`}
        </h2>
        <p className="text-xl text-purple-600">
          {foundCount} / {targetItems.count}
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 px-8 py-3 rounded-full text-2xl font-bold ${
          isComplete ? 'bg-green-400 text-white animate-bounce' : 'bg-yellow-300 text-yellow-800'
        }`}>
          {feedback}
        </div>
      )}

      {/* Grid */}
      <div
        className="grid gap-3 p-4 bg-white/50 rounded-3xl shadow-xl"
        style={{
          gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTap(item)}
            disabled={item.found || isComplete}
            className={`
              w-24 h-24 rounded-2xl flex items-center justify-center
              text-5xl transition-all duration-300 transform
              ${item.found
                ? 'bg-green-200 scale-75 opacity-50'
                : 'bg-white shadow-lg hover:scale-105 active:scale-95'
              }
              ${wiggleId === item.id ? 'animate-wiggle' : ''}
              disabled:cursor-default
            `}
            style={{
              minWidth: `${grid.itemSize}px`,
              minHeight: `${grid.itemSize}px`,
            }}
          >
            {item.found ? (
              <span className="text-4xl opacity-50">✨</span>
            ) : (
              <span className={item.isTarget ? '' : 'grayscale-0'}>
                {item.emoji}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Success celebration */}
      {isComplete && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">
              🎉
            </div>
            <p className="text-4xl font-bold text-purple-600">
              Amazing!
            </p>
          </div>
        </div>
      )}

      {/* Floating butterflies when complete */}
      {isComplete && (
        <>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-float-away pointer-events-none"
              style={{
                left: `${20 + i * 15}%`,
                bottom: '30%',
                animationDelay: `${i * 0.2}s`,
              }}
            >
              🦋
            </div>
          ))}
        </>
      )}
    </div>
  );
}
