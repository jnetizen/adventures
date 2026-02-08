#!/usr/bin/env npx tsx

/**
 * Generate images for The Storm Chasers of Jupiter (rkang-family)
 * 22 images total: 8 scenes + 5 cutscenes + 3 endings + 3 portraits + 3 rewards
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
  // ── Scene images (8) ──────────────────────────────────────────────
  {
    path: '/images/scenes/storm-chasers-jupiter/preview.png',
    description: 'Preview — Hero with Jupiter',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, standing heroically on a cliff with Jupiter filling the sky behind him — massive, colorful orange and white stripes, the Great Red Spot swirling dramatically. To his left (NOT overlapping, NOT touching), a small round bright PINK squishy bubblegum character with big cheerful eyes. To his right (NOT overlapping, NOT touching), a small rectangular dark BROWN chocolate bar character with GOLD foil half-peeled and big excited eyes. Stars and colorful nebulas in the background. Epic, adventurous mood.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/prologue.png',
    description: 'Prologue — Backyard Arrival',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A sunny backyard with green grass. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, holding a glowing star map with planets on it. A small candy-wrapper-shaped spaceship has landed on the grass nearby. A small round bright PINK squishy bubblegum character tumbles out of the ship spinning (NOT overlapping with boy). A small rectangular dark BROWN chocolate bar character with GOLD foil half-peeled waves a glowing map (NOT overlapping with boy). Warm golden hour lighting, friendly and inviting.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/scene-1-blastoff.png',
    description: 'Scene 1 — Blast Off (Cockpit)',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. Inside a colorful candy-themed spaceship cockpit. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, sitting in the captain's chair with hands on controls. A small round bright PINK squishy bubblegum character sits in a co-pilot seat pressing buttons (NOT overlapping with boy). A small rectangular dark BROWN chocolate bar character with GOLD foil stands nearby slapping Bubblegum's hand away from buttons (NOT overlapping). Stars visible through the windshield. Excited, adventurous energy.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/scene-2-stripes.png',
    description: 'Scene 2 — Jupiter\'s Stripes',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. Massive Jupiter filling the entire sky, seen from a candy-wrapper spaceship window. Giant swirling bands of orange, white, brown, and cream-colored clouds. Some stripes are fading to grey. One bright orange cloud ribbon is peeling away into space. The spaceship is tiny against the massive planet. Dramatic scale, vibrant colors contrasting with fading grey patches. Awe-inspiring.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/scene-3-io.png',
    description: 'Scene 3 — Moon Io (Volcanoes)',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. The surface of moon Io — rocky yellow-orange terrain with multiple colorful volcanoes erupting sparkly orange and red lava into a dark starry sky. Jupiter looms huge in the background. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, standing on a rocky ledge looking amazed. A small round bright PINK squishy bubblegum character pokes a small burping volcano (NOT overlapping with boy). A small rectangular dark BROWN chocolate bar character with GOLD foil points excitedly at eruptions (NOT overlapping). Gooey lava blocking a path in the foreground. Colorful and exciting, not scary.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/scene-4-red-spot.png',
    description: 'Scene 4 — The Great Red Spot',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A massive swirling red and orange storm seen from space — the Great Red Spot of Jupiter. Enormous spiral clouds in deep reds, oranges, and whites, spinning dramatically. A tiny candy-wrapper spaceship approaches the edge of the storm. The storm is HUGE compared to the ship. Jupiter's cloud bands visible around the edges. Epic scale, dramatic but beautiful.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/scene-5-eye.png',
    description: 'Scene 5 — Eye of the Storm',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. The calm center of a massive storm — walls of swirling red and orange clouds circle around a peaceful open space. In the center, a glowing ORANGE crystal floats and spins, radiating warm light. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, reaching toward the crystal. A small round bright PINK squishy bubblegum character holds his other hand (to his left, NOT overlapping). A small rectangular dark BROWN chocolate bar character with GOLD foil watches in awe (to his right, NOT overlapping). Magical, peaceful center amid dramatic storm walls.`,
  },
  {
    path: '/images/scenes/storm-chasers-jupiter/epilogue.png',
    description: 'Epilogue — Home with Star Map',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, sitting in his backyard at dusk holding a glowing star map. On the map, Saturn and Jupiter both glow brightly. The candy-wrapper spaceship flies away into a starry purple-orange sunset sky with a sparkly trail. Warm, peaceful, satisfying ending mood.`,
  },

  // ── Cutscene images (5) ────────────────────────────────────────────
  {
    path: '/images/cutscenes/storm-chasers-jupiter/scene-1-outcome.png',
    description: 'Scene 1 Outcome — Ship Rocketing Through Space',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A candy-wrapper spaceship rocketing through space with rainbow speed streaks behind it. Stars blur into colorful streaks of light. A big pink bubble trails behind the ship. The ship glows with energy. Dynamic, fast, exciting motion. Deep space background with colorful nebulas.`,
  },
  {
    path: '/images/cutscenes/storm-chasers-jupiter/scene-2-outcome.png',
    description: 'Scene 2 Outcome — Ship Wrapped in Cloud Ribbon',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A candy-wrapper spaceship wrapped in a flowing ribbon of bright orange cloud, like a colorful scarf, flying through Jupiter's atmosphere. A small round bright PINK squishy bubblegum character visible in the cockpit window with orange cloud puff around her face. Swirling orange and white cloud bands in background. Fun, victorious energy.`,
  },
  {
    path: '/images/cutscenes/storm-chasers-jupiter/scene-3-outcome.png',
    description: 'Scene 3 Outcome — Crossing the Lava',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, mid-leap between rocky platforms over glowing orange lava. A small round bright PINK squishy bubblegum character stretched between two rocks like a wobbly bridge nearby (NOT overlapping with boy). Volcanoes erupting colorfully in background. The candy-wrapper spaceship visible ahead. Action-packed and fun.`,
  },
  {
    path: '/images/cutscenes/storm-chasers-jupiter/scene-4-outcome.png',
    description: 'Scene 4 Outcome — Ship Spinning Through Storm',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A candy-wrapper spaceship spinning and tumbling through massive swirling red and orange storm clouds, riding the wind like a roller coaster. The ship is slightly tilted at a fun angle. Spiral cloud trails surround the ship. Dynamic spinning motion, dramatic red and orange storm walls. Exciting and thrilling, like an amusement park ride.`,
  },
  {
    path: '/images/cutscenes/storm-chasers-jupiter/scene-5-outcome.png',
    description: 'Scene 5 Outcome — Jupiter Restored',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. Jupiter seen from space, restored to full glory — vivid orange, white, brown, and cream stripes swirling beautifully. The Great Red Spot glows peacefully. A candy-wrapper spaceship flies away from Jupiter with a sparkly trail. Around Jupiter, dozens of tiny moons twinkle. Beautiful, triumphant, peaceful.`,
  },

  // ── Ending images (3) ──────────────────────────────────────────────
  {
    path: '/images/endings/storm-chasers-jupiter/ending-legendary.png',
    description: 'Legendary Ending — Moon Light Show',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. Jupiter in space with dozens of moons flashing bright lights simultaneously — a spectacular light show of twinkling colors around the giant planet. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents, floating in space with arms wide open, bathed in the light show. A small round bright PINK squishy bubblegum character and a small rectangular dark BROWN chocolate bar character with GOLD foil float nearby cheering (NOT overlapping with boy). Spectacular, celebratory, epic.`,
  },
  {
    path: '/images/endings/storm-chasers-jupiter/ending-great.png',
    description: 'Great Ending — Bedtime Storm Cloud',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A cozy bedroom at night. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing pajamas, lying in bed smiling. Above his pillow, a tiny friendly red storm cloud rains warm golden sparkles onto his pillow. Starry night visible through the window with Jupiter glowing in the sky. Warm, cozy, magical bedtime mood.`,
  },
  {
    path: '/images/endings/storm-chasers-jupiter/ending-good.png',
    description: 'Good Ending — Jupiter Winks',
    prompt: `Pixar-style 3D illustration, 16:9 landscape. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing pajamas, looking up at a night sky from his backyard. Jupiter is visible as a bright point of light, and the Great Red Spot appears to wink with a tiny sparkle. Warm, peaceful, stargazing mood. Purple-blue night sky with twinkling stars.`,
  },

  // ── Character portraits (3) ────────────────────────────────────────
  {
    path: '/images/characters/storm-chasers-jupiter/star-pilot.png',
    description: 'Star Pilot portrait',
    prompt: `Pixar-style 3D character portrait, square format. A 3-year-old East Asian boy with a slightly oval face and chubby cheeks, slightly spiky cropped black hair (forehead visible), and big dark brown eyes, wearing a space explorer suit with RED and SILVER accents. Confident, happy smile. Jupiter-themed background with orange and red swirling clouds. Heroic portrait lighting.`,
  },
  {
    path: '/images/characters/storm-chasers-jupiter/bubblegum.png',
    description: 'Bubblegum portrait',
    prompt: `Pixar-style 3D character portrait, square format. A small round bubblegum character, bright PINK and squishy, with big cheerful eyes and a wide bouncy smile, slightly transparent and shiny like actual bubblegum. Bouncing happily. Colorful space background with stars and Jupiter clouds.`,
  },
  {
    path: '/images/characters/storm-chasers-jupiter/chocolate.png',
    description: 'Chocolate portrait',
    prompt: `Pixar-style 3D character portrait, square format. A small rectangular chocolate bar character, rich dark BROWN with a shiny GOLD foil wrapper half-peeled, with big excited eyes and a wide happy grin. Holding a tiny glowing star map. Colorful space background with stars and Jupiter clouds.`,
  },

  // ── Reward images (3) ──────────────────────────────────────────────
  {
    path: '/images/rewards/storm-chasers-jupiter/storm-crystal.png',
    description: 'Storm Crystal reward (Legendary)',
    prompt: `Pixar-style 3D illustration, square format. A glowing orange crystal floating and radiating warm light, with tiny swirling red and orange storm patterns visible inside it. Golden sparkles emanate from it. Dark space background with stars. Magical, precious, special item.`,
  },
  {
    path: '/images/rewards/storm-chasers-jupiter/mini-storm.png',
    description: 'Friendly Little Storm reward (Great)',
    prompt: `Pixar-style 3D illustration, square format. A tiny cute red storm cloud with a friendly smiling face, raining warm golden sparkles. Small swirling wind patterns around it. Dark background with stars. Adorable, friendly, magical.`,
  },
  {
    path: '/images/rewards/storm-chasers-jupiter/jupiter-wink.png',
    description: 'Jupiter\'s Wink reward (Good)',
    prompt: `Pixar-style 3D illustration, square format. Jupiter as a friendly planet with a subtle winking expression in its cloud patterns — the Great Red Spot forms a winking eye shape. Warm, playful. Stars twinkling around it. Cute and charming.`,
  },
];

async function main() {
  console.log(`\n⚡ Generating images for The Storm Chasers of Jupiter`);
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

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

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
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
