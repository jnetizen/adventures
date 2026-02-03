#!/usr/bin/env npx tsx

/**
 * Generate images for Sparkle and the Lost Star adventure
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateImage } from './imageGenerationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Load prompts
const promptsPath = path.join(PROJECT_ROOT, 'src/data/adventures/sparkle-lost-star-prompts.json');
const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));

// Only generate scene and cutscene images (not character/rewards)
const imagesToGenerate = prompts.images.filter(
  (img: { type: string }) => img.type === 'scene' || img.type === 'cutscene'
);

async function main() {
  console.log(`\n🌟 Generating images for: ${prompts.adventureId}`);
  console.log(`   Total images: ${imagesToGenerate.length}`);
  console.log(`   Estimated cost: ~$${(imagesToGenerate.length * 0.04).toFixed(2)}`);
  console.log('');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('Error: GOOGLE_API_KEY not set');
    process.exit(1);
  }

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < imagesToGenerate.length; i++) {
    const img = imagesToGenerate[i];
    const outputPath = path.join(PROJECT_ROOT, 'public', img.path);
    const outputDir = path.dirname(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Skip if exists
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${imagesToGenerate.length}] ⏭️  Skipping ${img.filename} (exists)`);
      continue;
    }

    console.log(`[${i + 1}/${imagesToGenerate.length}] 🎨 Generating ${img.filename}...`);
    console.log(`   ${img.description}`);

    const result = await generateImage(img.prompt);

    if (result.success && result.imageBuffer) {
      fs.writeFileSync(outputPath, result.imageBuffer);
      console.log(`[${i + 1}/${imagesToGenerate.length}] ✅ Saved ${img.filename}`);
      generated++;
    } else {
      console.error(`[${i + 1}/${imagesToGenerate.length}] ❌ Failed: ${result.error}`);
      failed++;
    }

    // Delay between requests
    if (i < imagesToGenerate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`   Generated: ${generated}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Cost:      ~$${(generated * 0.04).toFixed(2)}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
