import { useState } from 'react';
import type { SeekerLensInstructions } from '../types/adventure';
import type { GameSession } from '../types/game';

interface SeekerLensDMControlsProps {
  instructions: SeekerLensInstructions;
  kidName: string;
  characterName: string;
  session: GameSession;
  onOverrideComplete: () => void;
  disabled?: boolean;
}

/**
 * DM controls for Seeker's Lens puzzle scenes.
 * Shows puzzle status, hints, and an override button.
 */
export default function SeekerLensDMControls({
  instructions,
  kidName,
  characterName,
  session,
  onOverrideComplete,
  disabled = false,
}: SeekerLensDMControlsProps) {
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const puzzleCompleted = session.puzzle_completed;
  const puzzleOutcome = session.puzzle_outcome;

  // Direction display text
  const directionLabels: Record<string, string> = {
    'up': 'Point at CEILING',
    'down': 'Point at FLOOR',
    'left': 'Point LEFT',
    'right': 'Point RIGHT',
    'flat-face-up': 'Hold FLAT (screen up)',
    'flat-face-down': 'Hold FLAT (screen down)',
  };

  const showNextHint = () => {
    if (currentHintIndex < instructions.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-lg text-center">
        <p className="font-bold text-lg">Seeker's Lens Puzzle</p>
      </div>

      {/* Player info */}
      <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
        <p className="font-semibold text-indigo-900">
          {kidName} ({characterName})
        </p>
      </div>

      {/* Hidden object info */}
      <div className="bg-white border-2 border-indigo-300 p-4 rounded-lg">
        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">
          What they're looking for
        </p>
        <div className="flex items-center gap-4">
          <img
            src={instructions.hiddenObject.imageUrl}
            alt={instructions.hiddenObject.name}
            className="w-16 h-16 object-contain rounded-lg bg-indigo-50 p-2"
          />
          <div>
            <p className="font-bold text-gray-900">{instructions.hiddenObject.name}</p>
            <p className="text-sm text-indigo-600">
              Direction: {directionLabels[instructions.triggerDirection] || instructions.triggerDirection}
            </p>
          </div>
        </div>
      </div>

      {/* Setup narration for DM to read */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
          Read aloud to start
        </p>
        <p className="text-amber-900 italic">"{instructions.setupNarration}"</p>
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
              ? `${instructions.hiddenObject.name} Found!`
              : 'Completed with help'
            : 'Player is searching...'
          }
        </p>
      </div>

      {/* Hints section */}
      {!puzzleCompleted && instructions.hints && instructions.hints.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
            Hints (read aloud if stuck)
          </p>

          {/* Show revealed hints */}
          {currentHintIndex >= 0 && (
            <div className="space-y-2 mb-3">
              {instructions.hints.slice(0, currentHintIndex + 1).map((hint, index) => (
                <div key={index} className="flex gap-2 text-blue-900 bg-white/50 p-2 rounded">
                  <span className="font-bold text-blue-500">{index + 1}.</span>
                  <span className="italic">"{hint.text}"</span>
                </div>
              ))}
            </div>
          )}

          {/* Show next hint button */}
          {currentHintIndex < instructions.hints.length - 1 && (
            <button
              onClick={showNextHint}
              className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-lg font-medium transition-colors text-sm"
            >
              {currentHintIndex < 0 ? 'Show First Hint' : 'Show Next Hint'}
              {currentHintIndex >= 0 && ` (${currentHintIndex + 1}/${instructions.hints.length})`}
            </button>
          )}
        </div>
      )}

      {/* Override button */}
      {!puzzleCompleted && (
        <button
          onClick={onOverrideComplete}
          disabled={disabled}
          className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
        >
          Override: Mark as Found
        </button>
      )}

      {puzzleCompleted && (
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Waiting for next scene...</p>
          {puzzleOutcome === 'success' && (
            <p className="text-green-700 italic text-sm">
              "{instructions.successNarration}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
