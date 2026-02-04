/**
 * Game Schemas
 *
 * Zod schemas for runtime validation of game-related data.
 * Use these to validate Supabase responses, localStorage data, and API payloads.
 */

import { z } from 'zod';
import { GAME_PHASES, OPERATION_TYPES, type GamePhase, type OperationType } from '../constants/game';

// =============================================================================
// Base Schemas
// =============================================================================

/**
 * Player schema - a kid assigned to a character.
 */
export const PlayerSchema = z.object({
  kidName: z.string().min(1),
  characterId: z.string().min(1),
});

export type Player = z.infer<typeof PlayerSchema>;

/**
 * Scene choice schema - choices made this scene.
 */
export const SceneChoiceSchema = z.object({
  characterId: z.string().min(1),
  choiceId: z.string().min(1),
  roll: z.number().int().min(1).max(20).optional(),
});

export type SceneChoice = z.infer<typeof SceneChoiceSchema>;

/**
 * Collected reward schema - rewards collected during adventure.
 */
export const CollectedRewardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().optional(),
  type: z.string().optional(),
});

export type CollectedReward = z.infer<typeof CollectedRewardSchema>;

/**
 * Active cutscene schema - cutscene overlay state.
 */
export const ActiveCutsceneSchema = z.object({
  characterId: z.string().min(1),
  imageUrl: z.string().min(1),
  outcomeText: z.string(),
  reward: CollectedRewardSchema.optional(),
});

export type ActiveCutscene = z.infer<typeof ActiveCutsceneSchema>;

/**
 * Dice type schema - supported dice types.
 */
export const DiceTypeSchema = z.union([z.literal(6), z.literal(10), z.literal(12), z.literal(20)]);

export type DiceType = z.infer<typeof DiceTypeSchema>;

/**
 * Game phase schema - validates game phase values.
 */
export const GamePhaseSchema = z.enum([
  GAME_PHASES.SETUP,
  GAME_PHASES.PROLOGUE,
  GAME_PHASES.PLAYING,
  GAME_PHASES.COMPLETE,
  GAME_PHASES.PAUSED,
]) as z.ZodType<GamePhase>;

// =============================================================================
// Game Session Schema
// =============================================================================

/**
 * Character scene state schema for session (lazy validation - defined before GameSession).
 */
export const SessionCharacterSceneStateSchema = z.object({
  characterId: z.string().min(1),
  sceneId: z.string().min(1),
  turnIndex: z.number().int().min(0),
  choices: z.array(SceneChoiceSchema),
});

/**
 * Full game session schema - validates Supabase session responses.
 */
export const GameSessionSchema = z.object({
  id: z.string().uuid(),
  room_code: z.string().length(4),
  current_scene: z.number().int().min(0),
  current_scene_id: z.string().nullable().optional(),
  phase: GamePhaseSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  adventure_id: z.string().nullable().optional(),
  players: z.array(PlayerSchema).optional(),
  current_character_turn_index: z.number().int().min(0).optional(),
  scene_choices: z.array(SceneChoiceSchema).optional(),
  success_count: z.number().int().min(0).optional(),
  dice_type: DiceTypeSchema.optional(),
  dice_mode: z.enum(['physical', 'digital']).optional(),
  pending_player_roll: z.number().int().min(1).nullable().optional(),
  feedback_rating: z.number().int().min(1).max(5).nullable().optional(),
  feedback_positive: z.string().nullable().optional(),
  feedback_negative: z.string().nullable().optional(),
  feedback_notes: z.string().nullable().optional(),
  feedback_submitted_at: z.string().datetime().nullable().optional(),
  active_cutscene: ActiveCutsceneSchema.nullable().optional(),
  collected_rewards: z.array(CollectedRewardSchema).optional(),
  character_scenes: z.array(SessionCharacterSceneStateSchema).nullable().optional(),
  is_split: z.boolean().nullable().optional(),
  // Puzzle scene state
  puzzle_started: z.boolean().nullable().optional(),
  puzzle_completed: z.boolean().nullable().optional(),
  puzzle_outcome: z.enum(['success', 'fail']).nullable().optional(),
  // Roll-until-success climax state
  climax_roll_count: z.number().int().min(0).nullable().optional(),
  climax_fail_index: z.number().int().min(0).nullable().optional(),
});

export type GameSession = z.infer<typeof GameSessionSchema>;

// =============================================================================
// Pending Operation Schemas
// =============================================================================

/**
 * Operation type schema - validates operation type values.
 */
export const OperationTypeSchema = z.enum([
  OPERATION_TYPES.CREATE_SESSION,
  OPERATION_TYPES.START_ADVENTURE,
  OPERATION_TYPES.START_SCENE,
  OPERATION_TYPES.START_SCENE_BY_ID,
  OPERATION_TYPES.SUBMIT_CHOICE,
  OPERATION_TYPES.ADVANCE_SCENE,
  OPERATION_TYPES.SUBMIT_FEEDBACK,
  OPERATION_TYPES.RESET_SESSION,
  OPERATION_TYPES.SHOW_CUTSCENE,
  OPERATION_TYPES.DISMISS_CUTSCENE,
  OPERATION_TYPES.COLLECT_REWARD,
  OPERATION_TYPES.SPLIT_PARTY,
  OPERATION_TYPES.REUNITE_PARTY,
]) as z.ZodType<OperationType>;

/**
 * Start adventure operation data schema.
 */
export const StartAdventureDataSchema = z.object({
  adventureId: z.string().min(1),
  players: z.array(PlayerSchema),
  diceType: DiceTypeSchema.optional(),
  diceMode: z.enum(['physical', 'digital']).optional(),
});

export type StartAdventureData = z.infer<typeof StartAdventureDataSchema>;

/**
 * Start scene operation data schema.
 */
export const StartSceneDataSchema = z.object({
  sceneNumber: z.number().int().min(0),
});

export type StartSceneData = z.infer<typeof StartSceneDataSchema>;

/**
 * Submit choice operation data schema.
 */
export const SubmitChoiceDataSchema = z.object({
  characterId: z.string().min(1),
  choiceId: z.string().min(1),
  roll: z.number().int().min(1).max(20),
  successThreshold: z.number().int().min(1).max(20),
});

export type SubmitChoiceData = z.infer<typeof SubmitChoiceDataSchema>;

/**
 * Advance scene operation data schema.
 */
export const AdvanceSceneDataSchema = z.object({
  nextSceneNumber: z.number().int().min(0).nullable(),
});

export type AdvanceSceneData = z.infer<typeof AdvanceSceneDataSchema>;

/**
 * Submit feedback operation data schema.
 */
export const SubmitFeedbackDataSchema = z.object({
  rating: z.number().int().min(1).max(5),
  positive: z.string().optional(),
  negative: z.string().optional(),
  notes: z.string().optional(),
});

export type SubmitFeedbackData = z.infer<typeof SubmitFeedbackDataSchema>;

/**
 * Reset session operation data schema (empty).
 */
export const ResetSessionDataSchema = z.object({});

export type ResetSessionData = z.infer<typeof ResetSessionDataSchema>;

/**
 * Show cutscene operation data schema.
 */
export const ShowCutsceneDataSchema = z.object({
  cutscene: ActiveCutsceneSchema,
});

export type ShowCutsceneData = z.infer<typeof ShowCutsceneDataSchema>;

/**
 * Dismiss cutscene operation data schema (empty).
 */
export const DismissCutsceneDataSchema = z.object({});

export type DismissCutsceneData = z.infer<typeof DismissCutsceneDataSchema>;

/**
 * Collect reward operation data schema.
 */
export const CollectRewardDataSchema = z.object({
  reward: CollectedRewardSchema,
});

export type CollectRewardData = z.infer<typeof CollectRewardDataSchema>;

/**
 * Start scene by ID operation data schema.
 */
export const StartSceneByIdDataSchema = z.object({
  sceneId: z.string().min(1),
  sceneNumber: z.number().int().min(0),
});

export type StartSceneByIdData = z.infer<typeof StartSceneByIdDataSchema>;

/**
 * Character scene state schema for parallel scenes.
 */
export const CharacterSceneStateSchema = z.object({
  characterId: z.string().min(1),
  sceneId: z.string().min(1),
  turnIndex: z.number().int().min(0),
  choices: z.array(SceneChoiceSchema),
});

export type CharacterSceneState = z.infer<typeof CharacterSceneStateSchema>;

/**
 * Split party operation data schema.
 */
export const SplitPartyDataSchema = z.object({
  characterScenes: z.array(CharacterSceneStateSchema),
});

export type SplitPartyData = z.infer<typeof SplitPartyDataSchema>;

/**
 * Reunite party operation data schema.
 */
export const ReunitePartyDataSchema = z.object({
  sceneId: z.string().min(1),
  sceneNumber: z.number().int().min(0),
});

export type ReunitePartyData = z.infer<typeof ReunitePartyDataSchema>;

/**
 * Base pending operation schema.
 */
export const PendingOperationBaseSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

/**
 * Full pending operation schema with discriminated union based on type.
 */
export const PendingOperationSchema = z.discriminatedUnion('type', [
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.CREATE_SESSION),
    data: z.object({}),
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.START_ADVENTURE),
    data: StartAdventureDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.START_SCENE),
    data: StartSceneDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.SUBMIT_CHOICE),
    data: SubmitChoiceDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.ADVANCE_SCENE),
    data: AdvanceSceneDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.SUBMIT_FEEDBACK),
    data: SubmitFeedbackDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.RESET_SESSION),
    data: ResetSessionDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.SHOW_CUTSCENE),
    data: ShowCutsceneDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.DISMISS_CUTSCENE),
    data: DismissCutsceneDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.COLLECT_REWARD),
    data: CollectRewardDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.START_SCENE_BY_ID),
    data: StartSceneByIdDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.SPLIT_PARTY),
    data: SplitPartyDataSchema,
  }),
  PendingOperationBaseSchema.extend({
    type: z.literal(OPERATION_TYPES.REUNITE_PARTY),
    data: ReunitePartyDataSchema,
  }),
]);

export type PendingOperation = z.infer<typeof PendingOperationSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Safely parse a game session from unknown data.
 * Returns null if validation fails.
 */
export function parseGameSession(data: unknown): GameSession | null {
  const result = GameSessionSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Safely parse a pending operation from unknown data.
 * Returns null if validation fails.
 */
export function parsePendingOperation(data: unknown): PendingOperation | null {
  const result = PendingOperationSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Safely parse an array of pending operations.
 * Returns only valid operations, filtering out invalid ones.
 */
export function parsePendingOperations(data: unknown): PendingOperation[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => parsePendingOperation(item))
    .filter((op): op is PendingOperation => op !== null);
}
