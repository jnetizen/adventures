import { useState, useEffect, useMemo } from 'react';
import { loadAdventure } from '../lib/adventures';
import { resolveAdventureImages } from '../lib/imageResolver';
import type { Adventure } from '../types/adventure';

interface UseAdventureLoaderResult {
  adventure: Adventure | null;
  loading: boolean;
}

/**
 * Loads adventure data when adventure_id changes.
 * Clears adventure when ID is null/undefined.
 *
 * When familySlug is provided, all image/video URLs in the adventure
 * are rewritten to point at the family's Supabase Storage folder.
 * When familySlug is null/undefined, original paths are used unchanged.
 */
export function useAdventureLoader(
  adventureId: string | null | undefined,
  familySlug?: string | null
): UseAdventureLoaderResult {
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adventureId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync adventure when ID clears
      setAdventure(null);
      return;
    }

    setLoading(true);
    loadAdventure(adventureId).then((loadedAdventure) => {
      setLoading(false);
      if (loadedAdventure) {
        setAdventure(loadedAdventure);
      }
    });
  }, [adventureId]);

  // Apply family image resolution as a memoized transform.
  // This covers all 15+ image URL fields via deep JSON transform.
  const resolvedAdventure = useMemo(() => {
    if (!adventure) return null;
    return resolveAdventureImages(adventure, familySlug, adventureId);
  }, [adventure, familySlug, adventureId]);

  return { adventure: resolvedAdventure, loading };
}
