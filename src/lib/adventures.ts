import type { Adventure, Scene, CharacterTurn, Choice, ChoiceOutcome, Ending, TurnOutcome, SingleEnding } from '../types/adventure';
import type { GameSession, Player } from '../types/game';

// Adventure JSON files in src/data/adventures/
import candyVolcano from '../data/adventures/candy-volcano.json';
import dragonKnightRescue from '../data/adventures/dragon-knight-rescue.json';
import fireGemQuest from '../data/adventures/fire-gem-quest.json';
import raceToRainbowReef from '../data/adventures/race-to-rainbow-reef.json';

const adventures: Record<string, Adventure> = {
  'candy-volcano': candyVolcano as Adventure,
  'dragon-knight-rescue': dragonKnightRescue as Adventure,
  'fire-gem-quest': fireGemQuest as Adventure,
  'race-to-rainbow-reef': raceToRainbowReef as Adventure,
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
  ageRating?: {
    minAge: number;
    maxAge?: number;
    reason?: string;
    intensity?: string[];
  };
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
    ageRating: adventure.preview.ageRating,
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
 * Calculate the outcome for a choice based on the dice roll.
 * Scales the success threshold based on dice type (thresholds are written for d20).
 * Formula: scaledThreshold = ceil(threshold * (diceType / 20))
 * This keeps roughly the same success probability across dice types.
 */
export function calculateChoiceOutcome(choice: Choice, roll: number, diceType: number = 20): ChoiceOutcome | null {
  // Default threshold if not specified
  const threshold = choice.successThreshold ?? 10;
  // Scale threshold proportionally to dice type (thresholds assume d20)
  const scaledThreshold = Math.ceil(threshold * (diceType / 20));
  if (roll >= scaledThreshold) {
    return choice.successOutcome ?? null;
  }
  return choice.failOutcome ?? null;
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

// ============================================
// New helpers for cutscene/turn-level outcomes
// ============================================

/**
 * Check if a character turn has turn-level outcomes (new format with cutscenes).
 * Returns true if successOutcome/failOutcome are defined at the turn level.
 */
export function hasPerTurnOutcomes(turn: CharacterTurn): boolean {
  return !!(turn.successOutcome || turn.failOutcome);
}

/**
 * Get the success threshold for a character turn.
 * Checks turn-level first, then falls back to choice-level.
 * If choice is provided and has its own threshold, that takes precedence for backward compatibility.
 */
export function getSuccessThreshold(turn: CharacterTurn, choice?: Choice): number {
  // Choice-level threshold takes precedence for backward compatibility
  if (choice?.successThreshold !== undefined) {
    return choice.successThreshold;
  }
  // Fall back to turn-level threshold
  return turn.successThreshold ?? 10; // Default to 10 if not specified
}

/**
 * Get the turn-level outcome based on roll result.
 * Only works for adventures with turn-level outcomes (hasPerTurnOutcomes = true).
 * Returns null if the turn doesn't have turn-level outcomes.
 */
export function getTurnOutcome(
  turn: CharacterTurn,
  roll: number,
  diceType: number = 20,
  choice?: Choice
): TurnOutcome | null {
  if (!hasPerTurnOutcomes(turn)) {
    return null;
  }

  const threshold = getSuccessThreshold(turn, choice);
  // Scale threshold proportionally to dice type (thresholds assume d20)
  const scaledThreshold = Math.ceil(threshold * (diceType / 20));
  
  if (roll >= scaledThreshold) {
    return turn.successOutcome ?? null;
  }
  return turn.failOutcome ?? null;
}

/**
 * Check if a roll is a success based on threshold and dice type.
 */
export function isRollSuccess(roll: number, threshold: number, diceType: number = 20): boolean {
  const scaledThreshold = Math.ceil(threshold * (diceType / 20));
  return roll >= scaledThreshold;
}

/**
 * Get the adventure ending - supports both single ending and tiered endings.
 * For single ending adventures, returns the single ending.
 * For tiered ending adventures, calculates based on success count.
 */
export function getAdventureEnding(
  adventure: Adventure,
  successCount: number = 0
): Ending | SingleEnding | null {
  // Single ending format (new)
  if (adventure.ending) {
    return adventure.ending;
  }
  
  // Tiered endings format (existing)
  if (adventure.endings && adventure.scoring) {
    return calculateEnding(adventure, successCount);
  }
  
  // Fallback: return first ending if available
  if (adventure.endings && adventure.endings.length > 0) {
    return adventure.endings[0];
  }
  
  return null;
}

/**
 * Check if an adventure uses single ending format (with loot screen).
 */
export function hasSingleEnding(adventure: Adventure): boolean {
  return !!adventure.ending;
}

/**
 * Check if an adventure uses tiered endings format.
 */
export function hasTieredEndings(adventure: Adventure): boolean {
  return !!(adventure.endings && adventure.endings.length > 0 && adventure.scoring);
}
