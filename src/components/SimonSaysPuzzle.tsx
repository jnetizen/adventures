import { useState, useEffect, useCallback, useRef } from 'react';
import type { SimonSaysPuzzleInstructions } from '../types/adventure';

interface SimonSaysPuzzleProps {
  instructions: SimonSaysPuzzleInstructions;
  onComplete: (success: boolean) => void;
}

type GamePhase = 'ready' | 'watching' | 'playing' | 'correct' | 'wrong' | 'success';

/**
 * Simon Says memory sequence puzzle.
 * Player watches symbols light up, then taps them in the same order.
 */
export default function SimonSaysPuzzle({ instructions, onComplete }: SimonSaysPuzzleProps) {
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const sequenceIndexRef = useRef(0);
  const completedRef = useRef(false);

  const { symbols, rounds, mistakeAllowance } = instructions;
  const currentRoundData = rounds[currentRound];
  const sequence = currentRoundData?.sequence || [];

  // Play the sequence for the current round
  const playSequence = useCallback(() => {
    if (!currentRoundData) return;

    setPhase('watching');
    setPlayerSequence([]);
    sequenceIndexRef.current = 0;

    const playNext = () => {
      if (sequenceIndexRef.current >= sequence.length) {
        // Sequence complete, player's turn
        setActiveSymbol(null);
        setPhase('playing');
        setFeedbackText("Your turn!");
        return;
      }

      const symbolId = sequence[sequenceIndexRef.current];
      setActiveSymbol(symbolId);

      // Clear after display time, then show next
      setTimeout(() => {
        setActiveSymbol(null);
        setTimeout(() => {
          sequenceIndexRef.current++;
          playNext();
        }, 200); // Gap between symbols
      }, currentRoundData.displaySpeed);
    };

    // Start sequence after a brief delay
    setTimeout(playNext, 500);
  }, [currentRoundData, sequence]);

  // Start first round when ready
  useEffect(() => {
    if (phase === 'ready') {
      const feedback = instructions.feedbackPerRound?.find(f => f.round === 1);
      setFeedbackText(feedback?.text || "Watch carefully...");

      const timer = setTimeout(() => {
        playSequence();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, playSequence, instructions.feedbackPerRound]);

  // Handle symbol tap
  const handleSymbolTap = useCallback((symbolId: string) => {
    if (phase !== 'playing' || completedRef.current) return;

    const expectedSymbol = sequence[playerSequence.length];
    const newSequence = [...playerSequence, symbolId];
    setPlayerSequence(newSequence);

    // Flash the tapped symbol
    setActiveSymbol(symbolId);
    setTimeout(() => setActiveSymbol(null), 200);

    if (symbolId !== expectedSymbol) {
      // Wrong symbol
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      if (newMistakes >= mistakeAllowance) {
        // Too many mistakes - but still succeed (Blot helps)
        setPhase('wrong');
        setFeedbackText(instructions.mistakeFeedback || "Oops! But Blot helps out!");
        setTimeout(() => {
          completedRef.current = true;
          onComplete(true); // Still succeed with help
        }, 2000);
      } else {
        // Try again
        setPhase('wrong');
        setFeedbackText(instructions.mistakeFeedback || "Try again!");
        setTimeout(() => {
          setPlayerSequence([]);
          setPhase('playing');
          setFeedbackText("Your turn!");
        }, 1500);
      }
      return;
    }

    // Correct symbol
    if (newSequence.length === sequence.length) {
      // Round complete!
      setPhase('correct');

      const nextRound = currentRound + 1;
      if (nextRound >= rounds.length) {
        // All rounds complete - success!
        setFeedbackText("Perfect!");
        setTimeout(() => {
          setPhase('success');
          setTimeout(() => {
            completedRef.current = true;
            onComplete(true);
          }, 1000);
        }, 800);
      } else {
        // Next round
        const feedback = instructions.feedbackPerRound?.find(f => f.round === nextRound + 1);
        setFeedbackText(feedback?.text || "Great! Next round...");
        setTimeout(() => {
          setCurrentRound(nextRound);
          playSequence();
        }, 1500);
      }
    }
  }, [phase, sequence, playerSequence, mistakes, mistakeAllowance, currentRound, rounds.length, onComplete, playSequence, instructions.feedbackPerRound, instructions.mistakeFeedback]);

  // Update playSequence when round changes
  useEffect(() => {
    if (currentRound > 0 && phase === 'correct') {
      playSequence();
    }
  }, [currentRound, phase, playSequence]);

  const getSymbolColor = (symbol: typeof symbols[0], isActive: boolean) => {
    if (!isActive) return 'bg-gray-700';
    switch (symbol.color) {
      case 'silver': return 'bg-gray-300';
      case 'gold': return 'bg-yellow-400';
      case 'orange': return 'bg-orange-500';
      case 'blue': return 'bg-blue-500';
      default: return 'bg-purple-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {phase === 'watching' ? 'Watch...' : phase === 'playing' ? 'Your Turn!' : phase === 'success' ? 'Amazing!' : 'Get Ready...'}
        </h2>
        <p className="text-lg text-purple-200">
          Round {currentRound + 1} of {rounds.length}
        </p>
      </div>

      {/* Feedback */}
      {feedbackText && (
        <div className={`mb-6 px-6 py-3 rounded-full text-lg font-semibold ${
          phase === 'wrong' ? 'bg-red-500/80 text-white' :
          phase === 'success' ? 'bg-green-500/80 text-white' :
          'bg-white/20 text-white'
        }`}>
          {feedbackText}
        </div>
      )}

      {/* Symbols Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {symbols.map((symbol) => {
          const isActive = activeSymbol === symbol.id;
          return (
            <button
              key={symbol.id}
              onClick={() => handleSymbolTap(symbol.id)}
              disabled={phase !== 'playing'}
              className={`
                w-28 h-28 rounded-2xl flex items-center justify-center
                text-6xl transition-all duration-200 transform
                ${getSymbolColor(symbol, isActive)}
                ${isActive ? 'scale-110 shadow-2xl ring-4 ring-white/50' : 'shadow-lg'}
                ${phase === 'playing' ? 'hover:scale-105 active:scale-95' : ''}
                disabled:cursor-not-allowed
              `}
            >
              {symbol.emoji}
            </button>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {sequence.map((_, idx) => (
          <div
            key={idx}
            className={`w-4 h-4 rounded-full transition-all ${
              idx < playerSequence.length
                ? 'bg-green-400 scale-110'
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Mistake counter */}
      {mistakes > 0 && (
        <p className="mt-4 text-sm text-purple-300">
          Tries: {mistakeAllowance - mistakes} remaining
        </p>
      )}

      {/* Success animation */}
      {phase === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-8xl animate-bounce">
            ✨
          </div>
        </div>
      )}
    </div>
  );
}
