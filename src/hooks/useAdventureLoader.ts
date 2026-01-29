import { useState, useEffect } from 'react';
import { loadAdventure } from '../lib/adventures';
import type { Adventure } from '../types/adventure';

interface UseAdventureLoaderResult {
  adventure: Adventure | null;
  loading: boolean;
}

/**
 * Loads adventure data when adventure_id changes.
 * Clears adventure when ID is null/undefined.
 *
 * Extracted from duplicate code in:
 * - DMPage.tsx:106-120
 * - PlayPage.tsx:85-99
 */
export function useAdventureLoader(adventureId: string | null | undefined): UseAdventureLoaderResult {
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

  return { adventure, loading };
}
