import { useState } from 'react';
import type { RollUntilSuccessInstructions } from '../types/adventure';
import type { DiceType, GameSession } from '../types/game';
import DiceRoller from './DiceRoller';

interface RollUntilSuccessControlsProps {
  instructions: RollUntilSuccessInstructions;
  kidName: string;
  characterName: string;
  diceType: DiceType;
  session: GameSession;
  onRollSubmit: (roll: number, isMax: boolean) => void;
  onVictory: () => void;
  disabled?: boolean;
}

/**
 * DM controls for roll-until-success climax scenes.
 * Player keeps rolling until they hit the max number on their die.
 */
export default function RollUntilSuccessControls({
  instructions,
  kidName,
  characterName,
  diceType,
  session,
  onRollSubmit,
  onVictory,
  disabled = false,
}: RollUntilSuccessControlsProps) {
  const [currentRoll, setCurrentRoll] = useState<number | null>(null);
  const [showingNarration, setShowingNarration] = useState(false);

  const rollCount = session.climax_roll_count ?? 0;
  const failIndex = session.climax_fail_index ?? 0;
  const maxRoll = diceType;

  // Get the current fail narration (clamped to last one)
  const currentNarration = instructions.failNarrations[
    Math.min(failIndex, instructions.failNarrations.length - 1)
  ];

  const handleRoll = (roll: number) => {
    setCurrentRoll(roll);
    const isMax = roll === maxRoll;

    if (isMax) {
      // Victory!
      onVictory();
    } else {
      // Show the dodge narration
      setShowingNarration(true);
      onRollSubmit(roll, false);
    }
  };

  const handleNextRoll = () => {
    setShowingNarration(false);
    setCurrentRoll(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 rounded-lg text-center">
        <p className="font-bold text-xl">BOSS BATTLE</p>
        <p className="text-sm opacity-90">Roll a {maxRoll} to win!</p>
      </div>

      {/* Player info */}
      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
        <p className="font-semibold text-red-900">
          {kidName} ({characterName})
        </p>
      </div>

      {/* Roll counter */}
      <div className="flex justify-center gap-4 text-center">
        <div className="bg-gray-100 px-4 py-2 rounded-lg">
          <p className="text-2xl font-bold text-gray-800">{rollCount}</p>
          <p className="text-xs text-gray-500">Rolls</p>
        </div>
        <div className="bg-amber-100 px-4 py-2 rounded-lg">
          <p className="text-2xl font-bold text-amber-800">d{diceType}</p>
          <p className="text-xs text-amber-600">Target: {maxRoll}</p>
        </div>
      </div>

      {/* Current state */}
      {showingNarration && currentRoll !== null ? (
        // Showing dodge narration
        <div className="space-y-4">
          <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-orange-600">Rolled: {currentRoll}</span>
              <span className="text-sm text-orange-500">Not {maxRoll} - dodge!</span>
            </div>
            <p className="text-lg text-orange-900 font-medium">
              {currentNarration}
            </p>
          </div>

          <button
            onClick={handleNextRoll}
            disabled={disabled}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-4 px-4 rounded-lg font-bold text-lg transition-colors"
          >
            Next Roll!
          </button>
        </div>
      ) : (
        // Ready for next roll
        <div className="space-y-4">
          <div className="bg-white border-2 border-red-300 p-4 rounded-lg">
            <p className="text-center text-gray-700 mb-3">
              {rollCount === 0
                ? `Have ${kidName} roll the d${diceType}!`
                : `Roll again! Need a ${maxRoll} to win!`
              }
            </p>

            {/* Manual roll input - tap what the kid rolled */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 text-center mb-2">Tap what they rolled:</p>
              <div className="flex justify-center gap-2">
                {Array.from({ length: diceType }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => handleRoll(num)}
                    disabled={disabled}
                    className={`w-12 h-12 rounded-lg font-bold text-xl transition-all ${
                      num === maxRoll
                        ? 'bg-green-500 hover:bg-green-600 text-white ring-2 ring-green-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    } disabled:opacity-50`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="text-xs text-gray-400">or use digital dice</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <DiceRoller
              onRoll={handleRoll}
              disabled={disabled}
              min={1}
              max={diceType}
            />
          </div>

          {/* Upcoming narration preview for DM */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              If they don't roll {maxRoll}, read:
            </p>
            <p className="text-sm text-gray-700 italic">
              "{currentNarration}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
