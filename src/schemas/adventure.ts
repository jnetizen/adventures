/**
 * Adventure Schemas
 *
 * Zod schemas for runtime validation of adventure data.
 * Use these to validate adventure JSON files and API responses.
 */

import { z } from 'zod';

// =============================================================================
// Choice and Outcome Schemas
// =============================================================================

/**
 * Choice outcome schema - text result of a choice.
 */
export const ChoiceOutcomeSchema = z.object({
  text: z.string(),
  animationKey: z.string().optional(),
});

export type ChoiceOutcome = z.infer<typeof ChoiceOutcomeSchema>;

/**
 * Reward schema - items/badges earned.
 */
export const RewardSchema = z.object({
  type: z.string().optional(),
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
});

export type Reward = z.infer<typeof RewardSchema>;

/**
 * Turn outcome schema - extended outcome with cutscene and reward.
 */
export const TurnOutcomeSchema = z.object({
  text: z.string(),
  animationKey: z.string().optional(),
  cutsceneImageUrl: z.string().optional(),
  reward: RewardSchema.optional(),
});

export type TurnOutcome = z.infer<typeof TurnOutcomeSchema>;

/**
 * Choice schema - individual choice option.
 */
export const ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  successThreshold: z.number().int().min(1).max(20).optional(),
  successOutcome: ChoiceOutcomeSchema.optional(),
  failOutcome: ChoiceOutcomeSchema.optional(),
});

export type Choice = z.infer<typeof ChoiceSchema>;

// =============================================================================
// Character Turn Schema
// =============================================================================

/**
 * Character turn schema - a character's turn in a scene.
 */
export const CharacterTurnSchema = z.object({
  characterId: z.string(),
  promptText: z.string(),
  choices: z.array(ChoiceSchema).min(1),
  successThreshold: z.number().int().min(1).max(20).optional(),
  successOutcome: TurnOutcomeSchema.optional(),
  failOutcome: TurnOutcomeSchema.optional(),
});

export type CharacterTurn = z.infer<typeof CharacterTurnSchema>;

// =============================================================================
// Scene Schema
// =============================================================================

/**
 * Scene outcome schema - what happens after all characters act.
 */
export const SceneOutcomeSchema = z.object({
  resultText: z.string(),
  nextSceneId: z.string().nullable(),
  rewards: z.array(RewardSchema).optional(),
});

export type SceneOutcome = z.infer<typeof SceneOutcomeSchema>;

/**
 * Scene schema - a scene in the adventure.
 */
export const SceneSchema = z.object({
  id: z.string(),
  sceneNumber: z.number().int().min(0),
  narrationText: z.string(),
  sceneImageUrl: z.string(),
  leadCharacterId: z.string().optional(),
  characterTurns: z.array(CharacterTurnSchema),
  outcome: SceneOutcomeSchema.optional(),
});

export type Scene = z.infer<typeof SceneSchema>;

// =============================================================================
// Character Schema
// =============================================================================

/**
 * Character schema - a playable character.
 */
export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
});

export type Character = z.infer<typeof CharacterSchema>;

// =============================================================================
// Prologue Schema
// =============================================================================

/**
 * Character intro schema - individual character introduction.
 */
export const CharacterIntroSchema = z.object({
  characterId: z.string(),
  introText: z.string(),
});

export type CharacterIntro = z.infer<typeof CharacterIntroSchema>;

/**
 * Prologue schema - adventure introduction.
 */
export const PrologueSchema = z.object({
  worldIntro: z.string(),
  characterIntros: z.array(CharacterIntroSchema),
  missionBrief: z.string(),
  prologueImageUrl: z.string().optional(),
});

export type Prologue = z.infer<typeof PrologueSchema>;

// =============================================================================
// Preview and Rating Schemas
// =============================================================================

/**
 * Intensity values for age rating.
 */
export const IntensitySchema = z.enum(['scary', 'intense', 'mild', 'gentle', 'action', 'suspense']);

export type Intensity = z.infer<typeof IntensitySchema>;

/**
 * Age rating schema - content appropriateness.
 */
export const AgeRatingSchema = z.object({
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0).optional(),
  reason: z.string().optional(),
  intensity: z.array(IntensitySchema).optional(),
});

export type AgeRating = z.infer<typeof AgeRatingSchema>;

/**
 * Preview schema - adventure preview info for selection screen.
 */
export const PreviewSchema = z.object({
  tagline: z.string(),
  themes: z.array(z.string()),
  estimatedMinutes: z.number().int().min(1),
  previewImageUrl: z.string(),
  ageRating: AgeRatingSchema.optional(),
});

export type Preview = z.infer<typeof PreviewSchema>;

// =============================================================================
// Ending and Scoring Schemas
// =============================================================================

/**
 * Scoring threshold schema - maps success count to ending.
 */
export const ScoringThresholdSchema = z.object({
  minSuccesses: z.number().int().min(0),
  endingId: z.string(),
});

export type ScoringThreshold = z.infer<typeof ScoringThresholdSchema>;

/**
 * Scoring schema - how to determine ending.
 */
export const ScoringSchema = z.object({
  thresholds: z.array(ScoringThresholdSchema),
});

export type Scoring = z.infer<typeof ScoringSchema>;

/**
 * Ending tier values.
 */
export const EndingTierSchema = z.enum(['good', 'great', 'legendary']);

export type EndingTier = z.infer<typeof EndingTierSchema>;

/**
 * Tiered ending schema - one of multiple possible endings.
 */
export const EndingSchema = z.object({
  id: z.string(),
  tier: EndingTierSchema,
  title: z.string(),
  narrationText: z.string(),
  rewards: z.array(RewardSchema).optional(),
});

export type Ending = z.infer<typeof EndingSchema>;

/**
 * Loot screen schema - configuration for displaying collected rewards.
 */
export const LootScreenSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export type LootScreen = z.infer<typeof LootScreenSchema>;

/**
 * Single ending schema - alternative to tiered endings.
 */
export const SingleEndingSchema = z.object({
  title: z.string(),
  narrationText: z.string(),
  endingImageUrl: z.string().optional(),
  lootScreen: LootScreenSchema.optional(),
});

export type SingleEnding = z.infer<typeof SingleEndingSchema>;

// =============================================================================
// Adventure Schema
// =============================================================================

/**
 * Full adventure schema - validates adventure JSON files.
 */
export const AdventureSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  preview: PreviewSchema,
  prologue: PrologueSchema,
  characters: z.array(CharacterSchema).min(1),
  scoring: ScoringSchema.optional(),
  scenes: z.array(SceneSchema).min(1),
  endings: z.array(EndingSchema).optional(),
  ending: SingleEndingSchema.optional(),
});

export type Adventure = z.infer<typeof AdventureSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Safely parse an adventure from unknown data.
 * Returns null if validation fails.
 */
export function parseAdventure(data: unknown): Adventure | null {
  const result = AdventureSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validate an adventure and return detailed errors if invalid.
 */
export function validateAdventure(data: unknown): { valid: true; adventure: Adventure } | { valid: false; errors: string[] } {
  const result = AdventureSchema.safeParse(data);
  if (result.success) {
    return { valid: true, adventure: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}
