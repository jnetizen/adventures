import { useState, useEffect, useCallback } from 'react';

interface MemoryCard {
  id: string;
  emoji: string;
  pairId: string;
}

interface MemoryPuzzleProps {
  pairs: { id: string; emoji: string }[];
  onComplete: (success: boolean) => void;
  prompt?: string;
}

/**
 * Memory matching game puzzle.
 * Cards start face down, player taps two to try to match.
 * Win when all pairs are matched.
 */
export default function MemoryPuzzle({
  pairs,
  onComplete,
  prompt = "Match all the pairs!",
}: MemoryPuzzleProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [moves, setMoves] = useState(0);

  // Initialize and shuffle cards
  useEffect(() => {
    const allCards: MemoryCard[] = [];
    pairs.forEach((pair) => {
      // Create two cards for each pair
      allCards.push(
        { id: `${pair.id}-a`, emoji: pair.emoji, pairId: pair.id },
        { id: `${pair.id}-b`, emoji: pair.emoji, pairId: pair.id }
      );
    });
    // Shuffle
    const shuffled = allCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [pairs]);

  // Check for win
  useEffect(() => {
    if (matchedPairIds.length === pairs.length && pairs.length > 0) {
      // All pairs matched - wait a moment for celebration, then complete
      setTimeout(() => {
        onComplete(true);
      }, 1000);
    }
  }, [matchedPairIds, pairs.length, onComplete]);

  // Check for match when two cards are flipped
  useEffect(() => {
    if (flippedIds.length === 2) {
      setIsChecking(true);
      setMoves(m => m + 1);

      const [first, second] = flippedIds;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === second);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match!
        setTimeout(() => {
          setMatchedPairIds(prev => [...prev, firstCard.pairId]);
          setFlippedIds([]);
          setIsChecking(false);
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setFlippedIds([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedIds, cards]);

  const handleCardTap = useCallback((cardId: string) => {
    // Don't allow taps while checking or if card is already flipped/matched
    if (isChecking) return;
    if (flippedIds.includes(cardId)) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || matchedPairIds.includes(card.pairId)) return;

    // Don't allow more than 2 flipped
    if (flippedIds.length >= 2) return;

    setFlippedIds(prev => [...prev, cardId]);
  }, [isChecking, flippedIds, cards, matchedPairIds]);

  const isFlipped = (cardId: string) => flippedIds.includes(cardId);
  const isMatched = (card: MemoryCard) => matchedPairIds.includes(card.pairId);

  const allMatched = matchedPairIds.length === pairs.length;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Memory Match</h2>
        <p className="text-purple-200">{prompt}</p>
        <p className="text-purple-300 text-sm mt-2">Moves: {moves}</p>
      </div>

      {/* Card grid - 2x3 for 6 cards */}
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {cards.map((card) => {
          const flipped = isFlipped(card.id);
          const matched = isMatched(card);

          return (
            <button
              key={card.id}
              onClick={() => handleCardTap(card.id)}
              disabled={matched || isChecking}
              className={`
                w-24 h-24 rounded-xl text-5xl flex items-center justify-center
                transition-all duration-300 transform
                ${matched
                  ? 'bg-green-500/50 scale-95 opacity-50'
                  : flipped
                    ? 'bg-white rotate-0 scale-105'
                    : 'bg-purple-600 hover:bg-purple-500 hover:scale-105'
                }
                ${!matched && !flipped ? 'shadow-lg' : ''}
              `}
              style={{
                perspective: '1000px',
              }}
            >
              {(flipped || matched) ? (
                <span className={matched ? 'opacity-50' : ''}>{card.emoji}</span>
              ) : (
                <span className="text-purple-300 text-3xl">?</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Win celebration */}
      {allMatched && (
        <div className="mt-6 text-center animate-bounce">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-xl font-bold text-green-400">All Matched!</p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-6 flex gap-2">
        {pairs.map((pair) => (
          <div
            key={pair.id}
            className={`w-3 h-3 rounded-full transition-colors ${
              matchedPairIds.includes(pair.id) ? 'bg-green-400' : 'bg-purple-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
