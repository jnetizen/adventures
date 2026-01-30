/**
 * Pure derived state calculations for DMPage.
 * These functions compute values from session and adventure data without side effects.
 */

import type { Adventure, Scene, CharacterTurn } from '../types/adventure';
import type { GameSession, CharacterSceneState } from '../types/game';
import { GAME_PHASES } from '../constants/game';
import {
  getCurrentCharacterTurn,
  getActiveCharacterTurns,
  getSceneActiveCharacters,
  getCurrentSceneWithBranching,
  getSceneById,
  allCharactersActed,
} from './adventures';

/**
 * Derive the active parallel character ID.
 * Uses user's selection if valid, otherwise defaults to first character in split.
 */
export function computeActiveParallelCharacterId(
  isSplit: boolean,
  characterScenes: CharacterSceneState[] | null | undefined,
  selectedParallelCharacterId: string | null
): string | null {
  if (!isSplit || !characterScenes?.length) return null;

  // If user has selected a character and they're still in the split, use that
  if (selectedParallelCharacterId) {
    const found = characterScenes.find(cs => cs.characterId === selectedParallelCharacterId);
    if (found) return found.characterId;
  }

  // Default to first character in the split
  return characterScenes[0].characterId;
}

/**
 * Get the active character's scene state when party is split.
 */
export function computeActiveCharacterScene(
  isSplit: boolean,
  characterScenes: CharacterSceneState[] | null | undefined,
  activeParallelCharacterId: string | null
): CharacterSceneState | null {
  if (!isSplit || !characterScenes || !activeParallelCharacterId) {
    return null;
  }
  return characterScenes.find(cs => cs.characterId === activeParallelCharacterId) || null;
}

/**
 * Compute the current scene based on session state.
 * When party is split, shows the active character's scene.
 * Otherwise uses branching-aware lookup.
 */
export function computeCurrentScene(
  session: GameSession | null,
  adventure: Adventure | null,
  isSplit: boolean,
  activeCharacterScene: CharacterSceneState | null
): Scene | null {
  if (!session || !adventure) return null;

  // When party is split, show the active character's scene
  if (isSplit && activeCharacterScene) {
    return getSceneById(adventure, activeCharacterScene.sceneId);
  }

  // Standard lookup (supports both scene ID and legacy scene number)
  return getCurrentSceneWithBranching(adventure, session);
}

/**
 * Compute the current character turn.
 * Handles both split party and standard scenarios.
 */
export function computeCurrentCharacterTurn(
  session: GameSession | null,
  adventure: Adventure | null,
  currentScene: Scene | null,
  isSplit: boolean,
  activeCharacterScene: CharacterSceneState | null
): CharacterTurn | null {
  if (!session || !adventure || !currentScene) return null;

  const players = session.players || [];
  if (session.phase !== GAME_PHASES.PLAYING || players.length === 0) {
    return null;
  }

  // When split, only show turns for active characters in this scene
  if (isSplit && activeCharacterScene) {
    const activeCharacters = getSceneActiveCharacters(currentScene, players);
    const scenePlayers = players.filter(p => activeCharacters.includes(p.characterId));
    const turnIndex = activeCharacterScene.turnIndex || 0;
    return getCurrentCharacterTurn(currentScene, turnIndex, scenePlayers);
  }

  // Standard turn lookup
  const turnIndex = session.current_character_turn_index || 0;
  return getCurrentCharacterTurn(currentScene, turnIndex, players);
}

/**
 * Check if all characters have acted in the current scene.
 * Handles both split party and standard scenarios.
 */
export function computeAllActed(
  session: GameSession | null,
  currentScene: Scene | null,
  isSplit: boolean,
  activeCharacterScene: CharacterSceneState | null
): boolean {
  if (!currentScene || !session) return false;

  if (isSplit && activeCharacterScene) {
    // For parallel scenes, check against the active characters in this scene
    const players = session.players || [];
    const activeCharacters = getSceneActiveCharacters(currentScene, players);
    const scenePlayers = players.filter(p => activeCharacters.includes(p.characterId));
    const activeTurns = getActiveCharacterTurns(currentScene, scenePlayers);
    return activeCharacterScene.turnIndex >= activeTurns.length;
  }

  // Standard check for non-split scenarios
  return allCharactersActed(currentScene, session);
}

/**
 * Check if a specific parallel scene is complete (all its characters have acted).
 */
export function isParallelSceneComplete(
  adventure: Adventure | null,
  session: GameSession | null,
  sceneId: string
): boolean {
  if (!adventure || !session?.character_scenes) return false;

  const scene = getSceneById(adventure, sceneId);
  if (!scene) return false;

  const charScene = session.character_scenes.find(cs => cs.sceneId === sceneId);
  if (!charScene) return false;

  const players = session.players || [];
  const activeCharacters = getSceneActiveCharacters(scene, players);
  const scenePlayers = players.filter(p => activeCharacters.includes(p.characterId));
  const activeTurns = getActiveCharacterTurns(scene, scenePlayers);

  return charScene.turnIndex >= activeTurns.length;
}

/**
 * Compute the status of all parallel scenes.
 * Returns whether all are complete and the ID of the next incomplete scene.
 */
export function computeParallelSceneStatus(
  adventure: Adventure | null,
  session: GameSession | null,
  isSplit: boolean
): { allComplete: boolean; nextIncompleteSceneId: string | null } {
  if (!isSplit || !session?.character_scenes || !adventure) {
    return { allComplete: true, nextIncompleteSceneId: null };
  }

  // Get unique scene IDs from character_scenes
  const sceneIds = [...new Set(session.character_scenes.map(cs => cs.sceneId))];

  // Check completion status for each
  const incompleteScenes = sceneIds.filter(id => !isParallelSceneComplete(adventure, session, id));

  return {
    allComplete: incompleteScenes.length === 0,
    nextIncompleteSceneId: incompleteScenes.length > 0 ? incompleteScenes[0] : null,
  };
}

/**
 * Check if the party is currently split.
 */
export function computeIsSplit(session: GameSession | null): boolean {
  return !!(session?.is_split && session?.character_scenes && session.character_scenes.length > 0);
}

/**
 * Group character scene states by scene ID.
 */
export function groupCharacterScenesBySceneId(
  characterScenes: GameSession['character_scenes']
): Map<string, NonNullable<GameSession['character_scenes']>> {
  const sceneGroups = new Map<string, NonNullable<GameSession['character_scenes']>>();
  if (!characterScenes) return sceneGroups;

  for (const cs of characterScenes) {
    const existing = sceneGroups.get(cs.sceneId) || [];
    sceneGroups.set(cs.sceneId, [...existing, cs]);
  }

  return sceneGroups;
}
