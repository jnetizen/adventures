import { useState } from 'react';
import type { AdventureListItem } from '../lib/adventures';
import PlaceholderImage from './PlaceholderImage';

interface AdventurePreviewGridProps {
  adventures: AdventureListItem[];
  /** Optional callback when an adventure is selected. If not provided, grid is read-only. */
  onSelect?: (adventureId: string) => void;
  /** Loading state for when selection is being processed */
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

/**
 * Grid of adventure previews for the player screen.
 * Can be read-only (waiting for DM) or interactive (onSelect provided).
 */
export default function AdventurePreviewGrid({ adventures, onSelect, loading }: AdventurePreviewGridProps) {
  const isInteractive = !!onSelect;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-gray-700 font-medium">
          {isInteractive ? 'Pick an adventure!' : 'Waiting for DM to pick an adventure...'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {isInteractive ? 'Tap one to start the fun!' : "Here's what we might play today!"}
        </p>
      </div>

      {loading && (
        <div className="text-center py-4">
          <span className="animate-spin inline-block rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {adventures.map((adv) => (
          <button
            key={adv.id}
            onClick={() => onSelect?.(adv.id)}
            disabled={loading || !isInteractive}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-left transition-all ${
              isInteractive
                ? 'hover:shadow-md hover:border-blue-300 hover:scale-[1.02] cursor-pointer'
                : 'opacity-90 cursor-default'
            } ${loading ? 'opacity-50' : ''}`}
          >
            <div className="aspect-video bg-amber-100">
              <PreviewImage url={adv.previewImageUrl} title={adv.title} />
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-gray-900">{adv.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{adv.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
