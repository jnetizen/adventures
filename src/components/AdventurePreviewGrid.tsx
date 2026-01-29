import { useState } from 'react';
import type { AdventureListItem } from '../lib/adventures';
import PlaceholderImage from './PlaceholderImage';

interface AdventurePreviewGridProps {
  adventures: AdventureListItem[];
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
 * Read-only grid of adventure previews for the player screen.
 * Shows available adventures while waiting for DM to select one.
 */
export default function AdventurePreviewGrid({ adventures }: AdventurePreviewGridProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-gray-700 font-medium">Waiting for DM to pick an adventure...</p>
        <p className="text-sm text-gray-500 mt-1">Here's what we might play today!</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {adventures.map((adv) => (
          <div
            key={adv.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden opacity-90"
          >
            <div className="aspect-video bg-amber-100">
              <PreviewImage url={adv.previewImageUrl} title={adv.title} />
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-bold text-gray-900">{adv.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{adv.tagline}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
