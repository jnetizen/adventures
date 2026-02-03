import type { Player } from '../types/game';
import type { Character } from '../types/adventure';
import { getPlayerForCharacter } from './adventures';

export function getKidDisplayName(
  players: Player[] | null | undefined,
  characterId: string,
  fallbackName = 'Unknown'
): string {
  return getPlayerForCharacter(players ?? [], characterId) || fallbackName;
}

/**
 * Substitute character names with kid names in narration text.
 * Replaces character names (e.g., "Spell Seeker") with the assigned kid's name.
 */
export function substituteCharacterNames(
  text: string,
  players: Player[] | null | undefined,
  characters: Character[] | null | undefined
): string {
  if (!text || !players || !characters || players.length === 0) return text;

  let result = text;

  // For each character, find the assigned player and replace the character name
  for (const character of characters) {
    const player = players.find(p => p.characterId === character.id);
    if (player && player.kidName) {
      // Replace character name with kid name (case insensitive, word boundary)
      const regex = new RegExp(`\\b${escapeRegExp(character.name)}\\b`, 'gi');
      result = result.replace(regex, player.kidName);
    }
  }

  return result;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
