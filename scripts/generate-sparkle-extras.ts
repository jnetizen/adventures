#!/usr/bin/env npx tsx

/**
 * Generate character and reward images for Sparkle adventure
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateImage } from './imageGenerationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const extraImages = [
  {
    path: '/images/characters/sparkle-lost-star/star-friend.png',
    description: 'Character portrait',
    prompt: 'Generate a 1:1 square portrait image. A 3-year-old girl with shoulder-length wavy brown hair, big brown eyes, very rosy cheeks, wearing a PINK dress with SILVER sparkles, smiling sweetly and looking friendly. Soft magical sparkles around her. Portrait style, shoulders and head visible, simple soft gradient background in pastel purple and pink, Pixar-adjacent storybook style, soft painterly rendering, children\'s book illustration.'
  },
  {
    path: '/images/rewards/sparkle-lost-star/twinkle-star.png',
    description: 'Twinkle star reward',
    prompt: 'Generate a 1:1 square image. A cute tiny glowing star with an adorable happy face, big sparkly eyes, small smile, golden-white glow with soft sparkles radiating outward. Simple soft gradient background in deep blue and purple like night sky. Collectible item style, centered composition, Pixar-adjacent storybook style, soft painterly rendering, children\'s book illustration.'
  },
  {
    path: '/images/rewards/sparkle-lost-star/star-heart.png',
    description: 'Star heart mark reward',
    prompt: 'Generate a 1:1 square image. A beautiful glowing heart shape made of starlight and sparkles, with a tiny star in the center, shimmering with soft golden and silver light. Magical and precious looking, like a badge of friendship. Simple soft gradient background in deep purple and pink. Collectible item style, centered composition, Pixar-adjacent storybook style, soft painterly rendering, children\'s book illustration.'
  }
];

async function main() {
  console.log('\n🌟 Generating character and reward images');
  console.log(`   Total: ${extraImages.length}`);
  console.log('');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('Error: GOOGLE_API_KEY not set');
    process.exit(1);
  }

  for (let i = 0; i < extraImages.length; i++) {
    const img = extraImages[i];
    const outputPath = path.join(PROJECT_ROOT, 'public', img.path);
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${extraImages.length}] ⏭️  Skipping (exists)`);
      continue;
    }

    console.log(`[${i + 1}/${extraImages.length}] 🎨 Generating ${img.description}...`);

    const result = await generateImage(img.prompt);

    if (result.success && result.imageBuffer) {
      fs.writeFileSync(outputPath, result.imageBuffer);
      console.log(`[${i + 1}/${extraImages.length}] ✅ Saved`);
    } else {
      console.error(`[${i + 1}/${extraImages.length}] ❌ Failed: ${result.error}`);
    }

    if (i < extraImages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
