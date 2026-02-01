import type { DragPuzzleInstructions } from '../types/adventure';
import type { GameSession } from '../types/game';

interface DragPuzzleDMControlsProps {
  instructions: DragPuzzleInstructions;
  kidName: string;
  characterName: string;
  session: GameSession;
  onOverrideComplete: () => void;
  disabled?: boolean;
}

/**
 * DM controls for in-game drag puzzle scenes.
 * Shows puzzle status, hints, and an override button.
 */
export default function DragPuzzleDMControls({
  instructions,
  kidName,
  characterName,
  session,
  onOverrideComplete,
  disabled = false,
}: DragPuzzleDMControlsProps) {
  const puzzleCompleted = session.puzzle_completed;
  const puzzleOutcome = session.puzzle_outcome;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-lg text-center">
        <p className="font-bold text-lg">Puzzle Challenge</p>
      </div>

      {/* Player info */}
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
        <p className="font-semibold text-amber-900">
          {kidName} ({characterName})
        </p>
      </div>

      {/* Puzzle prompt */}
      <div className="bg-white border-2 border-amber-300 p-4 rounded-lg">
        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
          Puzzle (on player screen)
        </p>
        <p className="text-lg font-semibold text-gray-900">
          {instructions.prompt || 'Put the symbols in the correct order'}
        </p>
      </div>

      {/* Correct answer (for DM reference) */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Correct Order (DM reference)
        </p>
        <div className="flex gap-2 justify-center">
          {instructions.correctOrder.map((symbolId, index) => {
            const symbol = instructions.symbols.find(s => s.id === symbolId);
            const isEmoji = symbol?.imageUrl && symbol.imageUrl.length <= 4 && !symbol.imageUrl.includes('/');
            return (
              <div key={symbolId} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white border-2 border-amber-300 rounded-lg flex items-center justify-center">
                  {isEmoji ? (
                    <span className="text-2xl">{symbol?.imageUrl}</span>
                  ) : symbol?.imageUrl ? (
                    <img src={symbol.imageUrl} alt={symbol.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-xs">{symbolId}</span>
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1">{index + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Puzzle status */}
      <div className={`p-4 rounded-lg ${
        puzzleCompleted
          ? puzzleOutcome === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-orange-50 border border-orange-200'
          : 'bg-blue-50 border border-blue-200'
      }`}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{
          color: puzzleCompleted
            ? puzzleOutcome === 'success' ? '#166534' : '#c2410c'
            : '#1e40af'
        }}>
          Status
        </p>
        <p className="font-semibold" style={{
          color: puzzleCompleted
            ? puzzleOutcome === 'success' ? '#166534' : '#c2410c'
            : '#1e40af'
        }}>
          {puzzleCompleted
            ? puzzleOutcome === 'success'
              ? 'Puzzle Solved!'
              : 'Completed with help'
            : 'Player is solving the puzzle...'
          }
        </p>
      </div>

      {/* Hints - if player is stuck */}
      {instructions.hints && instructions.hints.length > 0 && !puzzleCompleted && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
            Hints (read aloud if stuck)
          </p>
          <ul className="space-y-2">
            {instructions.hints.map((hint, index) => (
              <li key={index} className="flex gap-2 text-blue-900">
                <span className="font-bold text-blue-500">{index + 1}.</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Override button - if player is really stuck */}
      {!puzzleCompleted && (
        <button
          onClick={onOverrideComplete}
          disabled={disabled}
          className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
        >
          Override: Mark as Complete
        </button>
      )}

      {puzzleCompleted && (
        <p className="text-center text-gray-500 text-sm">
          Waiting for next scene...
        </p>
      )}
    </div>
  );
}
