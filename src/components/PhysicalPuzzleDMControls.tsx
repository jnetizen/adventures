import type { PhysicalPuzzleInstructions } from '../types/adventure';

interface PhysicalPuzzleDMControlsProps {
  instructions: PhysicalPuzzleInstructions;
  kidName: string;
  characterName: string;
  onSuccess: () => void;
  onFail: () => void;
  disabled?: boolean;
}

/**
 * DM controls for physical world puzzle scenes.
 * Shows the challenge, DM prompt, hints, and success/fail buttons.
 */
export default function PhysicalPuzzleDMControls({
  instructions,
  kidName,
  characterName,
  onSuccess,
  onFail,
  disabled = false,
}: PhysicalPuzzleDMControlsProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-3 rounded-lg text-center">
        <p className="font-bold text-lg">Physical Challenge</p>
      </div>

      {/* Player info */}
      <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
        <p className="font-semibold text-purple-900">
          {kidName} ({characterName})
        </p>
      </div>

      {/* Challenge - what's shown to the player */}
      <div className="bg-white border-2 border-purple-300 p-4 rounded-lg">
        <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">
          Challenge (on player screen)
        </p>
        <p className="text-lg font-semibold text-gray-900">
          {instructions.challenge}
        </p>
      </div>

      {/* DM Prompt - what to watch for */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
          What to watch for
        </p>
        <p className="text-amber-900">{instructions.dmPrompt}</p>
      </div>

      {/* Hints - if player is stuck */}
      {instructions.hints && instructions.hints.length > 0 && (
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

      {/* Success / Nice Try buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onSuccess}
          disabled={disabled}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-4 px-4 rounded-lg font-bold text-lg transition-colors"
        >
          Success!
        </button>
        <button
          onClick={onFail}
          disabled={disabled}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-4 px-4 rounded-lg font-bold text-lg transition-colors"
        >
          Nice Try!
        </button>
      </div>

      <p className="text-xs text-center text-gray-500">
        Both options advance the story - effort counts!
      </p>
    </div>
  );
}
