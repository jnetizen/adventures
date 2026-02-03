import type {
  Adventure,
  Scene,
  CharacterTurn,
  Choice,
  ChoiceOutcome,
  Ending,
  TurnOutcome,
  SingleEnding,
  PhysicalPuzzleInstructions,
  DragPuzzleInstructions,
} from '../types/adventure';
import type { DiceType } from '../types/game';
import type { GameSession, Player, CharacterSceneState } from '../types/game';
import { getCurrentScene, getSceneById, getCurrentSceneWithBranching } from './sceneLookup';

// Adventure JSON files in src/data/adventures/
import candyVolcano from '../data/adventures/candy-volcano.json';
import dragonKnightRescue from '../data/adventures/dragon-knight-rescue.json';
import fireGemQuest from '../data/adventures/fire-gem-quest.json';
import raceToRainbowReef from '../data/adventures/race-to-rainbow-reef.json';
import frozenVolcano from '../data/adventures/frozen-volcano-adventure-v2.json';
import shadowKnight from '../data/adventures/shadow-knight-adventure.json';
import rainbowBridge from '../data/adventures/rainbow-bridge-adventure.json';
import ancientShrine from '../data/adventures/ancient-shrine-adventure.json';
import wizardsLibrary from '../data/adventures/wizards-library-adventure.json';
import sparkleLostStar from '../data/adventures/sparkle-lost-star-adventure.json';

const adventures: Record<string, Adventure> = {
  'candy-volcano': candyVolcano as Adventure,
  'dragon-knight-rescue': dragonKnightRescue as Adventure,
  'fire-gem-quest': fireGemQuest as Adventure,
  'race-to-rainbow-reef': raceToRainbowReef as Adventure,
  'frozen-volcano': frozenVolcano as Adventure,
  'shadow-knight-lost-grove': shadowKnight as Adventure,
  'rainbow-bridge': rainbowBridge as Adventure,
  'ancient-shrine': ancientShrine as Adventure,
  'wizards-library': wizardsLibrary as Adventure,
  'sparkle-lost-star': sparkleLostStar as Adventure,
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
  if (!scene.characterTurns) return [];
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
 * Check if a character turn always succeeds (no dice roll needed).
 * Used for climax scenes where the outcome is predetermined.
 */
export function isAlwaysSucceedTurn(turn: CharacterTurn): boolean {
  return !!turn.alwaysSucceed;
}

/**
 * Check if a character turn has turn-level outcomes (new format with cutscenes).
 * Returns true if successOutcome/failOutcome are defined at the turn level,
 * OR if it's an alwaysSucceed turn with an outcome.
 */
export function hasPerTurnOutcomes(turn: CharacterTurn): boolean {
  return !!(turn.successOutcome || turn.failOutcome || (turn.alwaysSucceed && turn.outcome));
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
 *
 * For alwaysSucceed turns, returns turn.outcome directly (no roll check).
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

  // For alwaysSucceed turns, return the single outcome (no roll check)
  if (turn.alwaysSucceed && turn.outcome) {
    return turn.outcome;
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

// ============================================
// Branching/Parallel Scene Support
// ============================================

export { getCurrentScene, getSceneById, getCurrentSceneWithBranching };

/**
 * Check if a scene outcome leads to branching (different scenes for different characters).
 */
export function isBranchingOutcome(outcome: Scene['outcome']): boolean {
  if (!outcome?.nextSceneId) return false;
  return typeof outcome.nextSceneId === 'object' && outcome.nextSceneId !== null;
}

/**
 * Get the next scene ID for a specific character from a branching outcome.
 * Returns string for simple nextSceneId, or character-specific scene for branching.
 */
export function getNextSceneIdForCharacter(
  outcome: Scene['outcome'],
  characterId: string
): string | null {
  if (!outcome?.nextSceneId) return null;

  // Simple string - same scene for everyone
  if (typeof outcome.nextSceneId === 'string') {
    return outcome.nextSceneId;
  }

  // Branching - lookup by character ID
  if (typeof outcome.nextSceneId === 'object') {
    return outcome.nextSceneId[characterId] ?? null;
  }

  return null;
}

/**
 * Get all unique next scene IDs from a branching outcome.
 */
export function getAllNextSceneIds(outcome: Scene['outcome']): string[] {
  if (!outcome?.nextSceneId) return [];

  if (typeof outcome.nextSceneId === 'string') {
    return [outcome.nextSceneId];
  }

  if (typeof outcome.nextSceneId === 'object') {
    return [...new Set(Object.values(outcome.nextSceneId))];
  }

  return [];
}

/**
 * Check if a scene is a parallel scene (runs alongside another).
 */
export function isParallelScene(scene: Scene): boolean {
  return !!scene.isParallelScene;
}

/**
 * Get the characters that are active in a specific scene.
 * For parallel scenes, uses activeCharacters field.
 * For puzzle scenes, uses activeCharacter field (singular).
 * For normal scenes, returns all assigned player character IDs.
 */
export function getSceneActiveCharacters(scene: Scene, players: Player[]): string[] {
  const assignedIds = getAssignedCharacterIds(players);

  // If scene specifies active characters (plural), use those (filtered by assigned players)
  if (scene.activeCharacters && scene.activeCharacters.length > 0) {
    return scene.activeCharacters.filter(id => assignedIds.includes(id));
  }

  // If scene specifies a single active character (for puzzles), use that if assigned
  if (scene.activeCharacter && assignedIds.includes(scene.activeCharacter)) {
    return [scene.activeCharacter];
  }

  // Otherwise, all assigned players are active
  return assignedIds;
}

/**
 * Get the parallel scene that runs alongside this one (if any).
 */
export function getParallelScene(adventure: Adventure, scene: Scene): Scene | null {
  if (!scene.parallelWith) return null;
  return getSceneById(adventure, scene.parallelWith);
}

/**
 * Find all scenes at the same "level" (same sceneNumber, for parallel scenes).
 */
export function getScenesAtLevel(adventure: Adventure, sceneNumber: number): Scene[] {
  return adventure.scenes.filter(s => s.sceneNumber === sceneNumber);
}

/**
 * Check if the party should split based on current scene outcome.
 */
export function shouldPartySplit(scene: Scene): boolean {
  return isBranchingOutcome(scene.outcome);
}

/**
 * Check if parallel scenes have all been completed and party should reunite.
 * This happens when all parallel scenes point to the same next scene.
 */
export function shouldPartyReunite(
  adventure: Adventure,
  characterScenes: CharacterSceneState[]
): { reunite: boolean; nextSceneId: string | null } {
  if (characterScenes.length === 0) {
    return { reunite: false, nextSceneId: null };
  }

  // Get the next scene ID for each character's current scene
  const nextSceneIds = new Set<string>();

  for (const cs of characterScenes) {
    const scene = getSceneById(adventure, cs.sceneId);
    if (!scene?.outcome?.nextSceneId) continue;

    const nextId = getNextSceneIdForCharacter(scene.outcome, cs.characterId);
    if (nextId) {
      nextSceneIds.add(nextId);
    }
  }

  // If all characters are heading to the same scene, reunite
  if (nextSceneIds.size === 1) {
    const nextSceneId = [...nextSceneIds][0];
    const nextScene = getSceneById(adventure, nextSceneId);
    // Only reunite if the next scene is NOT a parallel scene
    if (nextScene && !nextScene.isParallelScene) {
      return { reunite: true, nextSceneId };
    }
  }

  return { reunite: false, nextSceneId: null };
}

/**
 * Initialize character scene states when the party splits.
 */
export function initializeCharacterScenes(
  scene: Scene,
  players: Player[]
): CharacterSceneState[] {
  if (!scene.outcome?.nextSceneId || typeof scene.outcome.nextSceneId !== 'object') {
    return [];
  }

  const states: CharacterSceneState[] = [];
  const assignedIds = getAssignedCharacterIds(players);

  for (const characterId of assignedIds) {
    const nextSceneId = scene.outcome.nextSceneId[characterId];
    if (nextSceneId) {
      states.push({
        characterId,
        sceneId: nextSceneId,
        turnIndex: 0,
        choices: [],
      });
    }
  }

  return states;
}

/**
 * Check if an adventure has any branching scenes.
 */
export function adventureHasBranching(adventure: Adventure): boolean {
  return adventure.scenes.some(scene =>
    isBranchingOutcome(scene.outcome) || isParallelScene(scene)
  );
}

// ============================================
// Puzzle Scene Support
// ============================================

/**
 * Check if a scene is a puzzle scene (any interactive puzzle type).
 */
export function isPuzzleScene(scene: Scene): boolean {
  return (
    scene.sceneType === 'puzzle-physical' ||
    scene.sceneType === 'puzzle-ingame' ||
    scene.sceneType === 'puzzle-seeker-lens' ||
    scene.sceneType === 'puzzle-memory' ||
    scene.sceneType === 'puzzle-simon' ||
    scene.sceneType === 'puzzle-tap-match' ||
    scene.sceneType === 'puzzle-draw' ||
    scene.sceneType === 'puzzle-ar-portal' ||
    scene.sceneType === 'puzzle-ar-catch'
  );
}

/**
 * Check if a scene is a physical world puzzle.
 */
export function isPhysicalPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-physical';
}

/**
 * Check if a scene is an in-game drag puzzle.
 */
export function isDragPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-ingame';
}

/**
 * Check if a scene is a Seeker's Lens puzzle (AR-like camera + gyroscope).
 */
export function isSeekerLensPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-seeker-lens';
}

/**
 * Get physical puzzle instructions (type guard).
 */
export function getPhysicalPuzzleInstructions(scene: Scene): PhysicalPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-physical' && scene.puzzleInstructions?.type === 'physical-world') {
    return scene.puzzleInstructions as PhysicalPuzzleInstructions;
  }
  return null;
}

/**
 * Get drag puzzle instructions (type guard).
 */
export function getDragPuzzleInstructions(scene: Scene): DragPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-ingame' && scene.puzzleInstructions?.type === 'in-game-drag') {
    return scene.puzzleInstructions as DragPuzzleInstructions;
  }
  return null;
}

/**
 * Get Seeker's Lens puzzle instructions (type guard).
 */
export function getSeekerLensInstructions(scene: Scene): import('../types/adventure').SeekerLensInstructions | null {
  if (scene.sceneType === 'puzzle-seeker-lens' && scene.puzzleInstructions?.type === 'seeker-lens') {
    return scene.puzzleInstructions as import('../types/adventure').SeekerLensInstructions;
  }
  return null;
}

/**
 * Check if a scene is a memory matching puzzle.
 */
export function isMemoryPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-memory';
}

/**
 * Get memory puzzle instructions (type guard).
 */
export function getMemoryPuzzleInstructions(scene: Scene): import('../types/adventure').MemoryPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-memory' && scene.puzzleInstructions?.type === 'memory-match') {
    return scene.puzzleInstructions as import('../types/adventure').MemoryPuzzleInstructions;
  }
  return null;
}

/**
 * Check if a scene is a Simon Says puzzle.
 */
export function isSimonPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-simon';
}

/**
 * Get Simon Says puzzle instructions (type guard).
 */
export function getSimonPuzzleInstructions(scene: Scene): import('../types/adventure').SimonSaysPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-simon' && scene.puzzleInstructions?.type === 'simon-says-cast') {
    return scene.puzzleInstructions as import('../types/adventure').SimonSaysPuzzleInstructions;
  }
  return null;
}

/**
 * Check if a scene is a Tap Match puzzle.
 */
export function isTapMatchPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-tap-match';
}

/**
 * Get Tap Match puzzle instructions (type guard).
 */
export function getTapMatchPuzzleInstructions(scene: Scene): import('../types/adventure').TapMatchPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-tap-match' && scene.puzzleInstructions?.type === 'tap-to-match') {
    return scene.puzzleInstructions as import('../types/adventure').TapMatchPuzzleInstructions;
  }
  return null;
}

/**
 * Check if a scene is a Draw Cast puzzle.
 */
export function isDrawPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-draw';
}

/**
 * Check if a scene is an AR Portal puzzle.
 */
export function isARPortalPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-ar-portal';
}

/**
 * Check if a scene is an AR Catch puzzle.
 */
export function isARCatchPuzzle(scene: Scene): boolean {
  return scene.sceneType === 'puzzle-ar-catch';
}

/**
 * Get Draw Cast puzzle instructions (type guard).
 */
export function getDrawPuzzleInstructions(scene: Scene): import('../types/adventure').DrawCastPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-draw' && scene.puzzleInstructions?.type === 'draw-to-cast') {
    return scene.puzzleInstructions as import('../types/adventure').DrawCastPuzzleInstructions;
  }
  return null;
}

/**
 * Get AR Portal puzzle instructions (type guard).
 */
export function getARPortalPuzzleInstructions(scene: Scene): import('../types/adventure').ARPortalPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-ar-portal' && scene.puzzleInstructions?.type === 'ar-portal-peek') {
    return scene.puzzleInstructions as import('../types/adventure').ARPortalPuzzleInstructions;
  }
  return null;
}

/**
 * Get AR Catch puzzle instructions (type guard).
 */
export function getARCatchPuzzleInstructions(scene: Scene): import('../types/adventure').ARCatchPuzzleInstructions | null {
  if (scene.sceneType === 'puzzle-ar-catch' && scene.puzzleInstructions?.type === 'ar-catch-object') {
    return scene.puzzleInstructions as import('../types/adventure').ARCatchPuzzleInstructions;
  }
  return null;
}

/**
 * Check if a scene is a story beat (no interaction).
 */
export function isStoryBeat(scene: Scene): boolean {
  return scene.sceneType === 'story-beat';
}

// ============================================
// Random Puzzle Variant Support
// ============================================

/**
 * Check if a scene has random puzzle variants.
 */
export function hasRandomPuzzle(scene: Scene): boolean {
  return scene.randomPuzzle === true && Array.isArray(scene.puzzleVariants) && scene.puzzleVariants.length > 0;
}

/**
 * Get a random puzzle variant ID for a scene.
 * Returns null if the scene doesn't have random puzzles.
 */
export function getRandomPuzzleVariantId(scene: Scene): string | null {
  if (!hasRandomPuzzle(scene)) return null;
  const variants = scene.puzzleVariants!;
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex].id;
}

/**
 * Resolve a scene with puzzle variants to a concrete scene.
 * If variantId is provided, uses that variant. Otherwise, selects randomly.
 * Returns the scene with the variant's properties merged in.
 */
export function resolvePuzzleVariant(scene: Scene, variantId?: string | null): Scene {
  if (!hasRandomPuzzle(scene)) return scene;

  const variants = scene.puzzleVariants!;
  let selectedVariant;

  if (variantId) {
    selectedVariant = variants.find(v => v.id === variantId);
  }

  if (!selectedVariant) {
    // Random selection
    const randomIndex = Math.floor(Math.random() * variants.length);
    selectedVariant = variants[randomIndex];
  }

  // Merge variant properties into the scene
  return {
    ...scene,
    sceneType: selectedVariant.sceneType,
    title: selectedVariant.title || scene.title,
    narrationText: selectedVariant.narrationText || scene.narrationText,
    puzzleInstructions: selectedVariant.puzzleInstructions,
  };
}

// ============================================
// Roll-Until-Success Climax Support
// ============================================

/**
 * Check if a scene uses roll-until-success climax mode.
 */
export function isRollUntilSuccessClimax(scene: Scene): boolean {
  return scene.isClimax === true && scene.climaxMode === 'roll-until-success';
}

/**
 * Get the maximum value for a dice type.
 */
export function getMaxRoll(diceType: DiceType): number {
  return diceType; // DiceType is 6, 10, 12, or 20 - the max is the same as the type
}

/**
 * Check if a roll is the maximum for the current dice type.
 */
export function isMaxRoll(roll: number, diceType: DiceType): boolean {
  return roll === getMaxRoll(diceType);
}

/**
 * Get the fail narration for a roll-until-success climax.
 * Returns the narration at the given index, or the last one if index exceeds array length.
 */
export function getClimaxFailNarration(scene: Scene, failIndex: number): string | null {
  if (!isRollUntilSuccessClimax(scene) || !scene.climaxInstructions) {
    return null;
  }

  const narrations = scene.climaxInstructions.failNarrations;
  if (!narrations || narrations.length === 0) {
    return null;
  }

  // Clamp to last narration (don't loop)
  const index = Math.min(failIndex, narrations.length - 1);
  return narrations[index];
}
