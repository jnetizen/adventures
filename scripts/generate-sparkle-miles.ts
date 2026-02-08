#!/usr/bin/env npx tsx

/**
 * Generate images for Sparkle & The Lost Star — Miles Kang version (rkang-family)
 * 11 images total: 6 scenes + 4 cutscenes + 1 character portrait
 * Reward images are character-agnostic — reuse existing ones.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateImage } from './imageGenerationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const images = [
  // ── Scene images (6) ──────────────────────────────────────────────
  {
    path: '/images/scenes/sparkle-lost-star-miles/prologue.png',
    description: 'Prologue — Moonflower Meadow (no characters)',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A magical nighttime meadow with large glowing white and purple moonflowers that shine softly in the dark, gentle fireflies dancing in the air, a deep blue starry sky above. One tiny star is falling, leaving a sparkle trail. Peaceful, magical, cozy atmosphere. NO characters visible. Soft moonlight. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/scenes/sparkle-lost-star-miles/scene-1.png',
    description: 'Scene 1 — Finding the Lost Star',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, kneeling gently beside a big glowing moonflower, peeking behind it to find a tiny cute glowing star creature with big sparkly eyes hiding there. The star is small, round, golden-white glow, adorable face looking shy but curious (NOT overlapping with boy). Nighttime meadow setting, soft glowing flowers, fireflies. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/scenes/sparkle-lost-star-miles/scene-2.png',
    description: 'Scene 2 — Cloud Staircase',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, standing at the bottom of magical fluffy cloud stairs that go up into the starry sky. A tiny cute glowing star companion floats beside the boy looking excited (NOT overlapping). Fireflies swirl nearby. The cloud steps are soft and puffy white, going up toward the stars. Magical nighttime atmosphere, sense of wonder. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/scenes/sparkle-lost-star-miles/scene-3.png',
    description: 'Scene 3 — The Moon Gate',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, standing at the top of cloud stairs before a beautiful Moon Gate made of glowing silver moonbeams forming an elegant archway. A kind sleeping Moon Guardian (gentle feminine figure made of soft silver moonlight with a peaceful motherly face) rests peacefully beside the gate (NOT overlapping with boy). A tiny cute glowing star companion floats near the boy (NOT overlapping). Beyond the gate, stars twinkle beautifully. Magical, peaceful atmosphere. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/scenes/sparkle-lost-star-miles/scene-4.png',
    description: 'Scene 4 — Ready to Fly',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, looking up in wonder at a LARGER glowing star (now big enough to ride, still cute with happy excited face, about the size of a small pony). The Moon Gate is open behind them showing beautiful starry sky. The Moon Guardian smiles encouragingly nearby (NOT overlapping with boy). The boy looks excited and ready for adventure. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/scenes/sparkle-lost-star-miles/ending.png',
    description: 'Ending — Waving Goodbye',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, standing in a moonflower meadow at night, looking up at the starry sky and waving happily. One particular star in the sky is twinkling extra bright with a cute waving pose. A gentle Moon Guardian made of moonlight smiles warmly nearby (NOT overlapping with boy). A small glowing star-shaped mark visible over the boy's heart. Happy but bittersweet ending, eternal friendship. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },

  // ── Cutscene images (4) ────────────────────────────────────────────
  {
    path: '/images/cutscenes/sparkle-lost-star-miles/scene1-twinkle.png',
    description: 'Scene 1 Outcome — Twinkle Snuggles',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, with a tiny adorable glowing star snuggling against his cheek, both looking happy. The star is small, round, golden-white glow with a cute happy face. Warm tingly glow around them both, magical sparkles, moonflower meadow background at night. Pure sweetness and new friendship, the boy's eyes closed with joy. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/cutscenes/sparkle-lost-star-miles/scene2-fireflies.png',
    description: 'Scene 2 Outcome — Firefly Lift',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, being lifted up gently by a swirl of hundreds of glowing golden fireflies, floating up toward a fluffy cloud step. A tiny cute glowing star bounces with joy beside him (NOT overlapping). Wonder and delight on the boy's face, his arms spread with joy, nighttime starry sky background, warm magical glow. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/cutscenes/sparkle-lost-star-miles/scene3-guardian.png',
    description: 'Scene 3 Outcome — Guardian Welcomes Them',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A kind beautiful Moon Guardian made of soft silver moonlight, with a gentle motherly face and warm smile, bending down to greet a 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents. A tiny cute glowing star floats between them happily (NOT overlapping with either). The Moon Gate glows softly behind them. Warm reunion moment, magical moonlit scene. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
  {
    path: '/images/cutscenes/sparkle-lost-star-miles/scene4-flying.png',
    description: 'Scene 4 Outcome — CLIMAX: Flying Through Stars!',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. MAGICAL FLIGHT! A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, riding joyfully on a large glowing star (big enough to sit on, with an ecstatically happy cute face), WHOOSHING through the beautiful starry sky leaving a massive sparkling rainbow trail behind them. Stars all around twinkling with happy faces. Pure joy and wonder, the boy's arms spread wide, biggest happiest smile, flying through the cosmos, MAXIMUM sparkle and magic. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },

  // ── Character portrait (1) ─────────────────────────────────────────
  {
    path: '/images/characters/sparkle-lost-star-miles/star-friend.png',
    description: 'Character portrait — Star Friend (Miles)',
    prompt: `Pixar-style 3D character portrait, 1:1 square format. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents. Smiling sweetly and looking friendly. Soft magical sparkles around him. Portrait style, shoulders and head visible. Simple soft gradient background in pastel purple and pink. Pixar-adjacent storybook style, soft painterly rendering, children's book illustration.`,
  },
];

async function main() {
  console.log(`\n🌟 Generating Miles Kang images for Sparkle & The Lost Star`);
  console.log(`   Total images: ${images.length}`);
  console.log(`   Estimated cost: ~$${(images.length * 0.04).toFixed(2)}`);
  console.log('');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('Error: GOOGLE_API_KEY not set');
    process.exit(1);
  }

  let generated = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const outputPath = path.join(PROJECT_ROOT, 'public', img.path);
    const outputDir = path.dirname(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Skip if exists
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${images.length}] ⏭️  Skipping ${img.description} (exists)`);
      continue;
    }

    console.log(`[${i + 1}/${images.length}] 🎨 Generating ${img.description}...`);

    const result = await generateImage(img.prompt);

    if (result.success && result.imageBuffer) {
      fs.writeFileSync(outputPath, result.imageBuffer);
      console.log(`[${i + 1}/${images.length}] ✅ Saved → public${img.path}`);
      generated++;
    } else {
      console.error(`[${i + 1}/${images.length}] ❌ Failed: ${result.error}`);
      failed++;
      failures.push(img.description);
    }

    // Delay between requests to avoid rate limits
    if (i < images.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`   Generated: ${generated}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Cost:      ~$${(generated * 0.04).toFixed(2)}`);
  if (failures.length > 0) {
    console.log(`   Failures:  ${failures.join(', ')}`);
  }
  console.log('');
  console.log('📝 Reward images are character-agnostic — reuse from sparkle-lost-star:');
  console.log('   /images/rewards/sparkle-lost-star/twinkle-star.png');
  console.log('   /images/rewards/sparkle-lost-star/star-heart.png');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
