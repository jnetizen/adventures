import type { Adventure } from '../types/adventure';

// Adventure JSON files in src/data/adventures/
import placeholder from '../data/adventures/placeholder.json';

const adventures: Record<string, Adventure> = {
  placeholder: placeholder as Adventure,
};

/**
 * Load an adventure by ID from src/data/adventures/.
 * Returns null if the adventure is not found.
 */
export async function loadAdventure(adventureId: string): Promise<Adventure | null> {
  const adventure = adventures[adventureId];
  return adventure ?? null;
}
