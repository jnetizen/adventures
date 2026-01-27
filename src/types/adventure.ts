export interface ChoiceOutcome {
  text: string;
  animationKey?: string;
}

export interface Choice {
  id: string;
  label: string;
  successThreshold: number;
  successOutcome: ChoiceOutcome;
  failOutcome: ChoiceOutcome;
}

export interface CharacterTurn {
  characterId: string;
  promptText: string;
  choices: Choice[];
}

export interface Reward {
  type: string;
  id: string;
  name: string;
  imageUrl?: string;
}

export interface SceneOutcome {
  resultText: string;
  nextSceneId: string | null;
  rewards?: Reward[];
}

export interface Scene {
  id: string;
  sceneNumber: number;
  narrationText: string;
  sceneImageUrl: string;
  leadCharacterId?: string;
  characterTurns: CharacterTurn[];
  outcome?: SceneOutcome;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface Preview {
  tagline: string;
  themes: string[];
  estimatedMinutes: number;
  previewImageUrl: string;
}

export interface CharacterIntro {
  characterId: string;
  introText: string;
}

export interface Prologue {
  worldIntro: string;
  characterIntros: CharacterIntro[];
  missionBrief: string;
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

export interface Adventure {
  id: string;
  title: string;
  description: string;
  preview: Preview;
  prologue: Prologue;
  characters: Character[];
  scoring: Scoring;
  scenes: Scene[];
  endings: Ending[];
}
