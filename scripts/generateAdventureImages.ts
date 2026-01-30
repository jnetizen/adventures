#!/usr/bin/env npx tsx

/**
 * CLI script to batch generate adventure images using Google Gemini
 *
 * Usage:
 *   npm run generate-images -- --adventure shadow-knight
 *   npm run generate-images -- --adventure shadow-knight --type backgrounds
 *   npm run generate-images -- --adventure shadow-knight --id prologue
 *   npm run generate-images -- --adventure shadow-knight --dry-run
 */

import 'dotenv/config';
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateImage, estimateCost } from './imageGenerationService.js';
import type { AdventureImageManifest, ImagePrompt } from './imageGeneration.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const PUBLIC_IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images');

interface CliOptions {
  adventure: string;
  type?: 'backgrounds' | 'cutscenes' | 'all';
  id?: string;
  dryRun?: boolean;
  force?: boolean;
  delay?: string;
}

program
  .name('generateAdventureImages')
  .description('Generate adventure images using Google Gemini')
  .requiredOption('-a, --adventure <id>', 'Adventure ID (e.g., shadow-knight)')
  .option('-t, --type <type>', 'Image type: backgrounds, cutscenes, or all', 'all')
  .option('-i, --id <id>', 'Generate single image by ID')
  .option('-d, --dry-run', 'Show what would be generated without calling API')
  .option('-f, --force', 'Regenerate even if file exists')
  .option('--delay <ms>', 'Delay between requests in ms', '1000')
  .parse();

const options = program.opts<CliOptions>();

async function main() {
  const { adventure, type, id, dryRun, force, delay } = options;
  const delayMs = parseInt(delay || '1000', 10);

  // Load manifest
  const manifestPath = path.join(DOCS_DIR, `${adventure}-image-prompts.json`);
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest: AdventureImageManifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8')
  );

  console.log(`\n📖 Adventure: ${manifest.adventureTitle}`);
  console.log(`   ID: ${manifest.adventureId}`);
  console.log(`   Total prompts: ${manifest.totalImages}`);

  // Filter prompts
  let prompts: ImagePrompt[] = manifest.prompts;

  if (id) {
    prompts = prompts.filter((p) => p.id === id);
    if (prompts.length === 0) {
      console.error(`Error: No prompt found with ID "${id}"`);
      process.exit(1);
    }
  } else if (type && type !== 'all') {
    const filterType = type === 'backgrounds' ? 'background' : 'cutscene';
    prompts = prompts.filter((p) => p.type === filterType);
  }

  console.log(`   Filtered to: ${prompts.length} images`);
  console.log(`   Model: gemini-2.0-flash-exp-image-generation`);
  console.log(`   Estimated cost: ~$${estimateCost(prompts.length).toFixed(3)}`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN - No images will be generated\n');
    for (const prompt of prompts) {
      const outputPath = getOutputPath(adventure, prompt);
      const exists = fs.existsSync(outputPath);
      const status = exists ? '(exists)' : '(new)';
      console.log(`   ${prompt.id} → ${prompt.filename} ${status}`);
    }
    console.log('\n✅ Dry run complete');
    return;
  }

  // Check environment variables
  if (!process.env.GOOGLE_API_KEY) {
    console.error('Error: GOOGLE_API_KEY environment variable is not set');
    console.error('Set it in your .env file: GOOGLE_API_KEY=your-api-key');
    process.exit(1);
  }

  // Ensure output directories exist
  ensureDirectories(adventure);

  // Generate images
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const outputPath = getOutputPath(adventure, prompt);
    const progress = `[${i + 1}/${prompts.length}]`;

    // Check if file exists
    if (fs.existsSync(outputPath) && !force) {
      console.log(`${progress} ⏭️  Skipping ${prompt.filename} (exists)`);
      skipped++;
      continue;
    }

    console.log(`${progress} 🎨 Generating ${prompt.filename}...`);

    const result = await generateImage(prompt.prompt);

    if (result.success && result.imageBuffer) {
      fs.writeFileSync(outputPath, result.imageBuffer);
      console.log(`${progress} ✅ Saved ${prompt.filename}`);
      generated++;
    } else {
      console.error(`${progress} ❌ Failed: ${result.error}`);
      failed++;
    }

    // Delay between requests (except for last one)
    if (i < prompts.length - 1) {
      await sleep(delayMs);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Total:     ${prompts.length}`);
  console.log(`   Estimated cost: ~$${estimateCost(generated).toFixed(3)}`);
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

function getOutputPath(adventureId: string, prompt: ImagePrompt): string {
  const subdir = prompt.type === 'background' ? 'scenes' : 'cutscenes';
  return path.join(PUBLIC_IMAGES_DIR, subdir, adventureId, prompt.filename);
}

function ensureDirectories(adventureId: string): void {
  const dirs = [
    path.join(PUBLIC_IMAGES_DIR, 'scenes', adventureId),
    path.join(PUBLIC_IMAGES_DIR, 'cutscenes', adventureId),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
