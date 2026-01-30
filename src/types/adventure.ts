export interface ChoiceOutcome {
  text: string;
  animationKey?: string;
}

/** Extended outcome with cutscene image and reward (for per-turn outcomes). */
export interface TurnOutcome {
  text: string;
  animationKey?: string;
  /** Cutscene image URL shown on kids' screen after roll. */
  cutsceneImageUrl?: string;
  /** Single reward earned for this outcome. */
  reward?: Reward;
}

export interface Choice {
  id: string;
  label: string;
  /** Success threshold for this choice. Optional if threshold is at turn level. */
  successThreshold?: number;
  /** Outcome when roll succeeds. Optional if outcomes are at turn level. */
  successOutcome?: ChoiceOutcome;
  /** Outcome when roll fails. Optional if outcomes are at turn level. */
  failOutcome?: ChoiceOutcome;
}

export interface CharacterTurn {
  characterId: string;
  promptText: string;
  /** Choices for this turn. Null for alwaysSucceed climax turns. */
  choices: Choice[] | null;
  /** Turn-level success threshold (used when choices don't have individual thresholds). */
  successThreshold?: number;
  /** Turn-level success outcome with cutscene and reward. */
  successOutcome?: TurnOutcome;
  /** Turn-level fail outcome with cutscene and reward. */
  failOutcome?: TurnOutcome;
  /** If true, this turn triggers the party to split into different scenes */
  triggersSceneSplit?: boolean;
  /** If true, this turn always succeeds (no dice roll needed). Uses outcome field. */
  alwaysSucceed?: boolean;
  /** Single outcome for alwaysSucceed turns (no success/fail split). */
  outcome?: TurnOutcome;
}

export interface Reward {
  type?: string;
  id: string;
  name: string;
  imageUrl?: string;
}

/** Character-specific reward (for endings where each character gets something different) */
export interface CharacterReward {
  characterId: string;
  item: string;
  description: string;
  imageUrl?: string;
}

export interface SceneOutcome {
  resultText: string;
  /**
   * Next scene ID. Can be:
   * - string: all characters go to the same scene
   * - null: this is the final scene
   * - Record<characterId, sceneId>: characters branch to different scenes
   */
  nextSceneId: string | null | Record<string, string>;
  rewards?: Reward[];
}

export interface Scene {
  id: string;
  sceneNumber: number;
  /** Optional title for the scene (shown in UI) */
  title?: string;
  narrationText: string;
  sceneImageUrl: string;
  leadCharacterId?: string;
  characterTurns: CharacterTurn[];
  outcome?: SceneOutcome;
  /** True if this scene runs in parallel with another */
  isParallelScene?: boolean;
  /** ID of the scene this runs in parallel with */
  parallelWith?: string;
  /** Which characters are active in this scene (for branching) */
  activeCharacters?: string[];
  /** True if this is a climax scene (dramatic finale). */
  isClimax?: boolean;
  /** Climax mode: 'rapid-fire' means quick succession of character moments. */
  climaxMode?: 'rapid-fire';
  /** Optional video URL for climax scene (alternative to individual cutscenes). */
  climaxVideoUrl?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  /** Optional pre-assignment to a player name */
  assignedTo?: string;
}

export interface AgeRating {
  /** Minimum recommended age */
  minAge: number;
  /** Optional max age (for "too babyish" upper bound) */
  maxAge?: number;
  /** Brief reason for the rating */
  reason?: string;
  /** Intensity descriptors to help parents decide */
  intensity?: ('scary' | 'intense' | 'mild' | 'gentle' | 'action' | 'suspense')[];
}

export interface Preview {
  tagline: string;
  themes: string[];
  estimatedMinutes: number;
  previewImageUrl: string;
  /** Age appropriateness rating */
  ageRating?: AgeRating;
}

export interface CharacterIntro {
  characterId: string;
  introText: string;
}

export interface Prologue {
  worldIntro: string;
  characterIntros: CharacterIntro[];
  missionBrief: string;
  /** Optional image showing the world/setting before characters appear */
  prologueImageUrl?: string;
}

export interface ScoringThreshold {
  minSuccesses: number;
  endingId: string;
}

export interface Scoring {
  thresholds: ScoringThreshold[];
}

export interface Ending {
  id: string;
  tier: 'good' | 'great' | 'legendary';
  title: string;
  narrationText: string;
  rewards?: Reward[];
}

/** Loot screen configuration for single-ending adventures. */
export interface LootScreen {
  title: string;
  description: string;
}

/** Single ending format (alternative to tiered endings). */
export interface SingleEnding {
  title: string;
  narrationText: string;
  /** Image shown during ending. */
  endingImageUrl?: string;
  /** Loot screen configuration for displaying collected rewards. */
  lootScreen?: LootScreen;
  /** Standard rewards (shared by all). */
  rewards?: Reward[];
  /** Character-specific rewards (each character gets their own). */
  characterRewards?: CharacterReward[];
}

export interface Adventure {
  id: string;
  title: string;
  description: string;
  preview: Preview;
  prologue: Prologue;
  characters: Character[];
  /** Scoring configuration for tiered endings. Optional if using single ending. */
  scoring?: Scoring;
  scenes: Scene[];
  /** Tiered endings (good/great/legendary based on success count). */
  endings?: Ending[];
  /** Single ending format (alternative to tiered endings). */
  ending?: SingleEnding;
}
