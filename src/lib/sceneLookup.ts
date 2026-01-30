import type { Adventure, Scene } from '../types/adventure';
import type { GameSession } from '../types/game';

/**
 * Get the current scene from an adventure by scene number.
 */
export function getCurrentScene(adventure: Adventure, sceneNumber: number): Scene | null {
  const found = adventure.scenes.find(scene => scene.sceneNumber === sceneNumber) || null;
  return found;
}

/**
 * Get a scene by its ID.
 */
export function getSceneById(adventure: Adventure, sceneId: string): Scene | null {
  return adventure.scenes.find(s => s.id === sceneId) ?? null;
}

/**
 * Get the current scene, supporting both legacy sceneNumber and new sceneId.
 * Prefers current_scene_id if set, falls back to current_scene number.
 */
export function getCurrentSceneWithBranching(
  adventure: Adventure,
  session: GameSession
): Scene | null {
  // Prefer scene ID if available
  if (session.current_scene_id) {
    return getSceneById(adventure, session.current_scene_id);
  }
  // Fall back to legacy scene number lookup
  return getCurrentScene(adventure, session.current_scene);
}
