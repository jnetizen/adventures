import type { Adventure, Scene, CharacterTurn, Choice, ChoiceOutcome, Ending } from '../types/adventure';
import type { GameSession, Player } from '../types/game';

// Adventure JSON files in src/data/adventures/
import candyVolcano from '../data/adventures/placeholder.json';
import dragonKnightRescue from '../data/adventures/dragon-knight-rescue.json';

const adventures: Record<string, Adventure> = {
  'candy-volcano': candyVolcano as Adventure,
  'dragon-knight-rescue': dragonKnightRescue as Adventure,
};

/**
 * Get list of available adventure IDs
 */
export function getAvailableAdventures(): string[] {
  return Object.keys(adventures);
}

export interface AdventureListItem {
  id: string;
  title: string;
  tagline: string;
  themes: string[];
  estimatedMinutes: number;
  previewImageUrl: string;
}

/**
 * Get adventure metadata including preview for selection screen
 */
export function getAdventureList(): AdventureListItem[] {
  return Object.entries(adventures).map(([id, adventure]) => ({
    id,
    title: adventure.title,
    tagline: adventure.preview.tagline,
    themes: adventure.preview.themes,
    estimatedMinutes: adventure.preview.estimatedMinutes,
    previewImageUrl: adventure.preview.previewImageUrl,
  }));
}

/**
 * Load an adventure by ID from src/data/adventures/.
 * Returns null if the adventure is not found.
 */
export async function loadAdventure(adventureId: string): Promise<Adventure | null> {
  const adventure = adventures[adventureId];
  return adventure ?? null;
}

/**
 * Get the current scene from an adventure by scene number
 */
export function getCurrentScene(adventure: Adventure, sceneNumber: number): Scene | null {
  const found = adventure.scenes.find(scene => scene.sceneNumber === sceneNumber) || null;
  return found;
}

/**
 * Get character IDs that have assigned players
 */
export function getAssignedCharacterIds(players: Player[]): string[] {
  return players.map(p => p.characterId);
}

/**
 * Get kid name for a character, or null if unassigned
 */
export function getPlayerForCharacter(players: Player[], characterId: string): string | null {
  const p = players.find(x => x.characterId === characterId);
  return p ? p.kidName : null;
}

/**
 * Get active character turns (only those with assigned players)
 */
export function getActiveCharacterTurns(scene: Scene, players: Player[]): CharacterTurn[] {
  const assigned = getAssignedCharacterIds(players);
  return scene.characterTurns.filter(turn => assigned.includes(turn.characterId));
}

/**
 * Get the current character turn from a scene.
 * turnIndex indexes into active turns only (assigned players).
 */
export function getCurrentCharacterTurn(
  scene: Scene,
  turnIndex: number,
  players: Player[]
): CharacterTurn | null {
  const active = getActiveCharacterTurns(scene, players);
  if (turnIndex < 0 || turnIndex >= active.length) {
    return null;
  }
  return active[turnIndex];
}

/**
 * Calculate the outcome for a choice based on the dice roll
 */
export function calculateChoiceOutcome(choice: Choice, roll: number): ChoiceOutcome {
  if (roll >= choice.successThreshold) {
    return choice.successOutcome;
  }
  return choice.failOutcome;
}

/**
 * Check if all assigned characters have acted in the current scene
 */
export function allCharactersActed(scene: Scene, session: GameSession): boolean {
  const players = session.players || [];
  const active = getActiveCharacterTurns(scene, players);
  const turnIndex = session.current_character_turn_index || 0;
  return turnIndex >= active.length;
}

/**
 * Determine which ending applies based on cumulative success count.
 * Thresholds are checked in order; first where successCount >= minSuccesses wins.
 */
export function calculateEnding(adventure: Adventure, successCount: number): Ending | null {
  const thresholds = adventure.scoring?.thresholds ?? [];
  for (const t of thresholds) {
    if (successCount >= t.minSuccesses) {
      const ending = adventure.endings?.find(e => e.id === t.endingId) ?? null;
      return ending;
    }
  }
  return null;
}
