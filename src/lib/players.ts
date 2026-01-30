import type { Player } from '../types/game';
import { getPlayerForCharacter } from './adventures';

export function getKidDisplayName(
  players: Player[] | null | undefined,
  characterId: string,
  fallbackName = 'Unknown'
): string {
  return getPlayerForCharacter(players ?? [], characterId) || fallbackName;
}
