import { useState } from 'react';
import type { Adventure, Ending } from '../types/adventure';
import type { GameSession, CollectedReward } from '../types/game';
import { calculateEnding, hasSingleEnding } from '../lib/adventures';
import PlaceholderImage from '../components/PlaceholderImage';

interface EndingPageProps {
  adventure: Adventure;
  session: GameSession;
  /** Optional action buttons (e.g. End Adventure, Start New) — DM only */
  actions?: React.ReactNode;
}

const tierLabels: Record<string, string> = {
  good: 'You Saved the Day!',
  great: 'Great Job!',
  legendary: 'Legendary Heroes!',
};

/** Loot screen component for displaying collected rewards */
function LootScreen({ 
  title, 
  description, 
  rewards 
}: { 
  title: string; 
  description: string; 
  rewards: CollectedReward[];
}) {
  if (rewards.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-100 to-yellow-50 rounded-xl shadow-lg p-6 border-2 border-amber-300">
      <h3 className="text-xl font-bold text-amber-900 mb-2">{title}</h3>
      <p className="text-amber-800 mb-4">{description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {rewards.map((reward, index) => (
          <div 
            key={`${reward.id}-${index}`}
            className="bg-white rounded-lg p-3 shadow-sm border border-amber-200 flex flex-col items-center text-center"
          >
            {reward.imageUrl ? (
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="w-16 h-16 object-contain rounded-lg mb-2"
              />
            ) : (
              <PlaceholderImage
                variant="character"
                label={reward.name}
                className="w-16 h-16 flex-shrink-0 mb-2"
              />
            )}
            <span className="text-sm font-medium text-gray-900">{reward.name}</span>
            {reward.type && (
              <span className="text-xs text-amber-700 uppercase">{reward.type}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EndingPage({ adventure, session, actions }: EndingPageProps) {
  const successCount = session.success_count ?? 0;
  const collectedRewards = session.collected_rewards ?? [];
  const [endingImageError, setEndingImageError] = useState(false);
  
  // Check if adventure uses single ending format
  const isSingleEnding = hasSingleEnding(adventure);
  
  // Get the appropriate ending
  const tieredEnding = !isSingleEnding ? calculateEnding(adventure, successCount) : null;
  const singleEnding = isSingleEnding ? adventure.ending : null;

  // Fallback if no ending found
  if (!tieredEnding && !singleEnding) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">The End</h2>
        <p className="text-gray-600 mt-2">Thanks for playing {adventure.title}!</p>
        {collectedRewards.length > 0 && (
          <LootScreen
            title="Your Treasures"
            description="Look at everything you collected!"
            rewards={collectedRewards}
          />
        )}
        {actions}
      </div>
    );
  }

  // Single ending format (new)
  if (singleEnding) {
    return (
      <div className="space-y-6">
        {/* Ending image if available */}
        {singleEnding.endingImageUrl && !endingImageError && (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img
              src={singleEnding.endingImageUrl}
              alt="Adventure ending"
              className="w-full h-auto"
              onError={() => setEndingImageError(true)}
            />
          </div>
        )}
        
        {/* Ending text */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-amber-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{singleEnding.title}</h2>
          <p className="text-lg text-gray-800 leading-relaxed">{singleEnding.narrationText}</p>
        </div>

        {/* Loot screen with collected rewards */}
        {singleEnding.lootScreen && collectedRewards.length > 0 && (
          <LootScreen
            title={singleEnding.lootScreen.title}
            description={singleEnding.lootScreen.description}
            rewards={collectedRewards}
          />
        )}

        {/* Fallback if no loot screen config but has rewards */}
        {!singleEnding.lootScreen && collectedRewards.length > 0 && (
          <LootScreen
            title="Your Treasures"
            description="Look at everything you collected on your adventure!"
            rewards={collectedRewards}
          />
        )}

        {actions}
      </div>
    );
  }

  // Tiered ending format (existing)
  const ending = tieredEnding as Ending;
  const tierLabel = tierLabels[ending.tier] ?? ending.tier;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-amber-200">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
          {tierLabel}
        </p>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{ending.title}</h2>
        <p className="text-lg text-gray-800 leading-relaxed">{ending.narrationText}</p>
      </div>

      {/* Ending rewards (tiered format) */}
      {ending.rewards && ending.rewards.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Rewards</h3>
          <ul className="space-y-2">
            {ending.rewards.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                {r.imageUrl ? (
                  <img
                    src={r.imageUrl}
                    alt={r.name}
                    className="w-10 h-10 object-contain rounded"
                  />
                ) : (
                  <PlaceholderImage
                    variant="character"
                    label={r.name}
                    className="w-10 h-10 flex-shrink-0"
                  />
                )}
                <span className="text-gray-800">{r.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Also show collected rewards if any (for tiered format adventures that also use per-turn rewards) */}
      {collectedRewards.length > 0 && (
        <LootScreen
          title="Treasures Collected"
          description="Everything you found along the way!"
          rewards={collectedRewards}
        />
      )}

      {actions}
    </div>
  );
}
