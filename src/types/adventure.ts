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
  value: string;
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
  characterTurns: CharacterTurn[];
  outcome?: SceneOutcome;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface Adventure {
  id: string;
  title: string;
  description: string;
  characters: Character[];
  scenes: Scene[];
}
