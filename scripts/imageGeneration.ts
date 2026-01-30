/**
 * Types for Google Gemini image generation
 */

/** A single image prompt entry */
export interface ImagePrompt {
  id: string;
  type: 'background' | 'cutscene';
  filename: string;
  prompt: string;
  scene?: string;
  character?: string;
  variant?: 'success' | 'fail' | 'climax';
}

/** Manifest for all images in an adventure */
export interface AdventureImageManifest {
  adventureId: string;
  adventureTitle: string;
  totalImages: number;
  estimatedCost: number;
  prompts: ImagePrompt[];
}

/** Options for image generation */
export interface ImageGenerationOptions {
  seed?: number;
}

/** Result from image generation */
export interface ImageGenerationResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
  seed?: number;
}

/** Progress callback for batch generation */
export interface GenerationProgress {
  current: number;
  total: number;
  promptId: string;
  filename: string;
  status: 'generating' | 'skipped' | 'success' | 'error';
  error?: string;
}
