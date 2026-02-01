/**
 * Google Gemini API image generation service
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ImageGenerationOptions,
  ImageGenerationResult,
} from './imageGeneration.js';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Generate an image using Gemini 2.0 Flash
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'GOOGLE_API_KEY environment variable is not set',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp-image-generation',
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as Record<string, unknown>,
  });

  // Enhance prompt for image generation
  const imagePrompt = `${prompt}\n\nGenerate this as a single high-quality illustration.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await model.generateContent(imagePrompt);
      const result = response.response;

      // Find image part in response
      for (const candidate of result.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          const inlineData = part.inlineData;
          if (inlineData?.mimeType?.startsWith('image/')) {
            const imageBuffer = Buffer.from(inlineData.data, 'base64');
            return {
              success: true,
              imageBuffer,
              seed: options.seed,
            };
          }
        }
      }

      return {
        success: false,
        error: 'No image data in response',
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Check if it's a rate limit error or server error
      const isRetryable =
        lastError.message.includes('429') ||
        lastError.message.includes('RESOURCE_EXHAUSTED') ||
        lastError.message.includes('500') ||
        lastError.message.includes('503') ||
        lastError.message.includes('overloaded');

      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        break;
      }

      // Exponential backoff
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error during image generation',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get estimated cost for generating images
 * Gemini 2.0 Flash image generation pricing (estimate)
 */
export function estimateCost(count: number): number {
  // Gemini Flash is very cheap - roughly $0.001 per image
  return count * 0.001;
}
