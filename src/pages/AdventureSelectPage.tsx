import { useState } from 'react';
import type { AdventureListItem } from '../lib/adventures';
import PlaceholderImage from '../components/PlaceholderImage';

interface AdventureSelectPageProps {
  adventures: AdventureListItem[];
  onSelect: (adventureId: string) => void;
  loading?: boolean;
}

/** Preview image with error fallback to PlaceholderImage */
function PreviewImage({ url, title }: { url?: string; title: string }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return <PlaceholderImage variant="scene" label={title} />;
  }

  return (
    <img
      src={url}
      alt={title}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export default function AdventureSelectPage({
  adventures,
  onSelect,
  loading,
}: AdventureSelectPageProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Choose an Adventure</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {adventures.map((adv) => (
          <div
            key={adv.id}
            className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:border-amber-400 transition-colors"
          >
            <div className="aspect-video bg-amber-100">
              <PreviewImage url={adv.previewImageUrl} title={adv.title} />
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-gray-900">{adv.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{adv.tagline}</p>
              <div className="flex flex-wrap gap-1">
                {adv.themes.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>~{adv.estimatedMinutes} min</span>
                {adv.ageRating && (
                  <span className={`font-medium ${adv.ageRating.minAge >= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                    Ages {adv.ageRating.minAge}+
                  </span>
                )}
              </div>
              {adv.ageRating?.intensity && (
                <div className="flex flex-wrap gap-1">
                  {adv.ageRating.intensity.map((i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        i === 'gentle' || i === 'mild'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => onSelect(adv.id)}
                disabled={loading}
                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Select Adventure
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
