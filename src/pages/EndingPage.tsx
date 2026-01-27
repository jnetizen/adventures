import type { Adventure } from '../types/adventure';
import type { GameSession } from '../types/game';
import { calculateEnding } from '../lib/adventures';
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

export default function EndingPage({ adventure, session, actions }: EndingPageProps) {
  const successCount = session.success_count ?? 0;
  const ending = calculateEnding(adventure, successCount);

  if (!ending) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">The End</h2>
        <p className="text-gray-600 mt-2">Thanks for playing {adventure.title}!</p>
        {actions}
      </div>
    );
  }

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

      {actions}
    </div>
  );
}
