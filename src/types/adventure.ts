export interface ChoiceOutcome {
  text: string;
  animationKey?: string;
}

// ============================================
// Scene Types (for puzzle and special scenes)
// ============================================

/** Scene type determines the UI and interaction model for a scene. */
export type SceneType =
  | 'standard'
  | 'puzzle-physical'
  | 'puzzle-ingame'
  | 'puzzle-seeker-lens'
  | 'puzzle-memory'
  | 'puzzle-simon'      // Simon Says memory sequence
  | 'puzzle-tap-match'  // Tap to find items
  | 'puzzle-draw'       // Draw to cast spell
  | 'puzzle-ar-portal'  // AR portal peek
  | 'puzzle-ar-catch'   // AR catch flying object
  | 'story-beat';       // No interaction, just narration

/** A symbol/element used in drag puzzles. */
export interface PuzzleSymbol {
  id: string;
  name: string;
  /** Can be an image URL or emoji string. */
  imageUrl: string;
}

/** Instructions for physical world puzzles (player does something in real life). */
export interface PhysicalPuzzleInstructions {
  type: 'physical-world';
  /** Challenge text displayed to the player. */
  challenge: string;
  /** Instructions for the DM (what to watch for). */
  dmPrompt: string;
  /** Hints the DM can read aloud if player is stuck. */
  hints: string[];
  /** How success is determined. */
  successTrigger: 'dm-confirms';
  /** Narration shown on success. */
  successNarration?: string;
  /** Narration shown on "nice try" (fail). */
  failNarration?: string;
}

/** Instructions for in-game drag puzzles (player interacts with screen). */
export interface DragPuzzleInstructions {
  type: 'in-game-drag';
  /** Prompt/question to display above the puzzle. */
  prompt?: string;
  /** Symbols available for the puzzle. */
  symbols: PuzzleSymbol[];
  /** The correct order of symbol IDs. */
  correctOrder: string[];
  /** Hints the DM can read aloud if player is stuck. */
  hints: string[];
  /** Narration shown on success. */
  successNarration?: string;
}

/** Direction the player must point the iPad to reveal the hidden object. */
export type SeekerDirection = 'up' | 'down' | 'left' | 'right' | 'flat-face-up' | 'flat-face-down';

/** Hidden object revealed during Seeker's Lens puzzle. */
export interface SeekerHiddenObject {
  id: string;
  name: string;
  /** Image URL for the hidden object (2D sprite). */
  imageUrl: string;
  /** Width in pixels. */
  width?: number;
  /** Height in pixels. */
  height?: number;
  /** Animation style when object appears. */
  animation?: 'float-bounce' | 'sparkle' | 'pulse';
}

/** Progressive hint with delay for Seeker's Lens puzzle. */
export interface SeekerHint {
  /** Delay in seconds before this hint is available. */
  delaySeconds: number;
  /** Hint text for DM to read aloud. */
  text: string;
}

/** Instructions for Seeker's Lens puzzle (AR-like camera + gyroscope). */
export interface SeekerLensInstructions {
  type: 'seeker-lens';
  /** Setup narration explaining how to use the Seeker's Lens. */
  setupNarration: string;
  /** The hidden object to find. */
  hiddenObject: SeekerHiddenObject;
  /** Direction the iPad must be pointed to reveal the object. */
  triggerDirection: SeekerDirection;
  /** Tolerance in degrees for direction matching (default 35). */
  directionToleranceDegrees?: number;
  /** Progressive hints for DM to read aloud. */
  hints: SeekerHint[];
  /** Narration shown when the object is revealed. */
  revealNarration: string;
  /** Prompt text shown when object is visible (e.g., "Tap Spark!"). */
  tapPrompt: string;
  /** Narration shown after player taps the object. */
  successNarration: string;
  /** Optional reward for finding the object. */
  successReward?: Reward;
}

/** Pair for memory matching puzzle. */
export interface MemoryPair {
  id: string;
  emoji: string;
}

/** Instructions for memory matching puzzle. */
export interface MemoryPuzzleInstructions {
  type: 'memory-match';
  /** Prompt shown above the puzzle. */
  prompt?: string;
  /** Pairs to match (3 pairs = 6 cards). */
  pairs: MemoryPair[];
  /** Narration shown on success. */
  successNarration?: string;
}

/** Symbol for Simon Says puzzle. */
export interface SimonSymbol {
  id: string;
  emoji: string;
  color: string;
  sound?: string;
}

/** Round configuration for Simon Says puzzle. */
export interface SimonRound {
  roundNumber: number;
  sequence: string[];
  displaySpeed: number;
}

/** Instructions for Simon Says memory sequence puzzle. */
export interface SimonSaysPuzzleInstructions {
  type: 'simon-says-cast';
  setupNarration: string;
  symbols: SimonSymbol[];
  rounds: SimonRound[];
  feedbackPerRound?: { round: number; text: string }[];
  mistakeAllowance: number;
  mistakeFeedback?: string;
  successNarration: string;
}

/** Grid item for Tap Match puzzle. */
export interface TapMatchItem {
  type: string;
  count: number;
  imageUrl?: string;
}

/** Instructions for Tap to Match puzzle. */
export interface TapMatchPuzzleInstructions {
  type: 'tap-to-match';
  setupNarration: string;
  grid: {
    rows: number;
    columns: number;
    itemSize: number;
  };
  targetItems: {
    type: string;
    count: number;
    imageUrl?: string;
    releaseAnimation?: string;
  };
  distractorItems: TapMatchItem[];
  wrongTapBehavior?: {
    animation?: string;
    sound?: string;
    penalty?: string;
  };
  correctTapFeedback?: {
    animation?: string;
    sound?: string;
    encouragement?: string[];
  };
  successNarration: string;
}

/** Instructions for Draw to Cast puzzle. */
export interface DrawCastPuzzleInstructions {
  type: 'draw-to-cast';
  setupNarration: string;
  rune: {
    shape: string;
    glowColor: string;
    strokeWidth: number;
    tolerancePercent: number;
  };
  trailEffect?: {
    type: string;
    color: string;
    particleCount: number;
  };
  successThreshold: {
    minPercentComplete: number;
    timeBonus?: boolean;
  };
  encouragement?: { atPercent: number; text: string }[];
  successNarration: string;
  failNarration?: string;
}

/** Instructions for AR Portal Peek puzzle. */
export interface ARPortalPuzzleInstructions {
  type: 'ar-portal-peek';
  setupNarration: string;
  targetObject: {
    id: string;
    name: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    animation?: string;
  };
  arEnvironment?: {
    background?: string;
    floatingObjects?: string[];
    hiddenLocation?: string;
    depthLayers?: number;
  };
  mechanics?: {
    moveToLook?: boolean;
    zoomByDistance?: boolean;
    hintGlow?: {
      enabled?: boolean;
      intensityByProximity?: boolean;
    };
  };
  hints?: { delaySeconds: number; text: string }[];
  tapPrompt?: string;
  successNarration: string;
}

/** Instructions for AR Catch Object puzzle. */
export interface ARCatchPuzzleInstructions {
  type: 'ar-catch-object';
  setupNarration: string;
  targetObject: {
    id: string;
    name: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    animation?: string;
  };
  arBehavior?: {
    movementPattern?: string;
    speedLevel?: number;
    fliesOffScreen?: boolean;
    hidesTemporarily?: boolean;
    giggles?: boolean;
    catchesRequired?: number;
  };
  difficulty?: Record<string, { speed: string; hideTime: number }>;
  catchFeedback?: { catchNumber: number; text: string }[];
  hints?: { delaySeconds: number; text: string }[];
  successNarration: string;
}

/** Union type for all puzzle instruction types. */
export type PuzzleInstructions =
  | PhysicalPuzzleInstructions
  | DragPuzzleInstructions
  | SeekerLensInstructions
  | MemoryPuzzleInstructions
  | SimonSaysPuzzleInstructions
  | TapMatchPuzzleInstructions
  | DrawCastPuzzleInstructions
  | ARPortalPuzzleInstructions
  | ARCatchPuzzleInstructions;

/** Instructions for roll-until-success climax (solo boss fight). */
export interface RollUntilSuccessInstructions {
  type: 'roll-until-highest';
  /** Narrations shown on each non-max roll (player dodges/survives). */
  failNarrations: string[];
  /** How success is determined. */
  successTrigger: 'roll-highest-number';
  /** Narration shown when player finally succeeds. */
  successNarration?: string;
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
  /** Single character who performs puzzle scenes */
  activeCharacter?: string;
  /** True if this is a climax scene (dramatic finale). */
  isClimax?: boolean;
  /** Climax mode: 'rapid-fire' = quick succession, 'roll-until-success' = solo boss fight. */
  climaxMode?: 'rapid-fire' | 'roll-until-success';
  /** Optional video URL for climax scene (alternative to individual cutscenes). */
  climaxVideoUrl?: string;
  /** Instructions for roll-until-success climax mode. */
  climaxInstructions?: RollUntilSuccessInstructions;

  // Puzzle scene support
  /** Scene type determines UI and interaction model. Defaults to 'standard'. */
  sceneType?: SceneType;
  /** Instructions for puzzle scenes (physical or in-game). */
  puzzleInstructions?: PuzzleInstructions;
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
  /** Optional video showing the world/setting (takes precedence over image) */
  prologueVideoUrl?: string;
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
