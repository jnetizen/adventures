# Claude Code Prompt: Google Imagen Integration for Quest Family

## FILE LOCATIONS IN PROJECT:
```
~/Projects/adventures/docs/imagen-integration-prompt.md   <- This file
~/Projects/adventures/docs/shadow-knight-image-prompts.json  <- Prompts JSON
```

---

## The Prompt (Copy everything below this line into Claude Code)

---

I need to integrate Google's Imagen 3 API (via Vertex AI) for generating Quest Family adventure images. This will replace our current manual workflow of copying prompts into Replicate.

## Project Context

Quest Family generates illustrated scenes for a kids' storytelling app. We have:
- Background images (8 per adventure) - scene settings without characters
- Cutscene images (15+ per adventure) - character moments with success/fail variants
- All images are 16:9 landscape, PNG format
- Prompts follow a specific format optimized for Flux (should transfer to Imagen)

Existing docs are in `~/Projects/adventures/docs/`

## File Structure Needed

```
/src/services/
  imageGeneration.ts       # Core Imagen API wrapper
  
/src/scripts/
  generateAdventureImages.ts  # CLI script to batch generate images
  
/src/types/
  imageGeneration.ts       # TypeScript types

/public/images/
  /backgrounds/
    /shadow-knight/        # Per-adventure folders
    /frozen-volcano/
  /cutscenes/
    /shadow-knight/
    /frozen-volcano/

/docs/
  shadow-knight-image-prompts.json   # Already exists here
```

## 1. Core Image Generation Service

Create `/src/services/imageGeneration.ts`:

Requirements:
- Use `@google-cloud/aiplatform` package
- Connect to Vertex AI Imagen 3 API
- Model: `imagen-3.0-generate-001` (quality) or `imagen-3.0-fast-generate-001` (speed)
- Support these parameters:
  - `aspectRatio: "16:9"` (always)
  - `outputFormat: "png"` (always)  
  - `sampleCount: 1`
  - `negativePrompt: "text, watermark, signature, blurry, low quality, extra limbs, bad anatomy"`
  - Optional `seed` for reproducibility
- Handle errors gracefully with retries (Vertex AI has rate limits)
- Return image as Buffer

Environment variables needed:
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `GOOGLE_CLOUD_LOCATION` - Region (default: `us-central1`)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON key

## 2. Image Prompts JSON Format

Create a type and parser for this format in `/src/types/imageGeneration.ts`:

```typescript
interface ImagePrompt {
  id: string;                    // e.g., "scene1-oliver-success"
  type: "background" | "cutscene";
  filename: string;              // e.g., "scene1-oliver-success.png"
  prompt: string;                // The full generation prompt
  scene?: string;                // Which scene this belongs to
  character?: string;            // For cutscenes: which character
  variant?: "success" | "fail";  // For cutscenes with variants
}

interface AdventureImageManifest {
  adventureId: string;
  adventureTitle: string;
  totalImages: number;
  estimatedCost: number;         // At $0.04/image for Imagen 3
  prompts: ImagePrompt[];
}
```

## 3. Batch Generation Script

Create `/src/scripts/generateAdventureImages.ts`:

CLI usage:
```bash
# Generate all images for an adventure
npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight

# Generate only backgrounds
npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight --type backgrounds

# Generate only cutscenes  
npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight --type cutscenes

# Generate a single image by ID
npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight --id scene1-oliver-success

# Dry run (show what would be generated)
npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight --dry-run
```

Features needed:
- Read prompts from `/docs/{adventureId}-image-prompts.json` (e.g., `/docs/shadow-knight-image-prompts.json`)
- Save images to appropriate `/public/images/backgrounds/` or `/public/images/cutscenes/` folder
- Skip images that already exist (unless `--force` flag)
- Rate limiting: 1 second delay between requests (configurable)
- Progress logging: `[3/23] Generating scene1-oliver-success.png...`
- Error handling: Log failures but continue with remaining images
- Summary at end: `Generated 23/23 images. Total cost: ~$0.92`

## 4. Convert Markdown Prompts to JSON

Create a one-time script `/src/scripts/convertPromptsToJson.ts`:

This reads a markdown file like `shadow-knight-image-prompts.md` and outputs `image-prompts.json`.

The markdown format has prompts in code blocks like:
```
### scene1-oliver-success.png
**Scene:** Oliver burning through wet leaves with flame fists

\`\`\`
Generate a 16:9 landscape image. A 5-year-old boy hero...
\`\`\`
```

Parse this into the ImagePrompt format.

## 5. Example image-prompts.json

Here's what the output should look like for reference:

```json
{
  "adventureId": "shadow-knight",
  "adventureTitle": "The Shadow Knight and the Lost Grove",
  "totalImages": 23,
  "estimatedCost": 0.92,
  "prompts": [
    {
      "id": "prologue",
      "type": "background",
      "filename": "prologue.png",
      "scene": "prologue",
      "prompt": "Generate a 16:9 landscape image. A magical forest kingdom showing signs of decay, ancient trees with leaves turning gray, wilting flowers, soft mist creeping between the trunks, a faint dark castle silhouette visible in the deep forest distance, tiny glowing spirits hiding behind mushrooms looking sad, twilight lighting with purple and gray tones, sense of a once-beautiful place losing its magic, Pixar-adjacent storybook style, soft painterly rendering, melancholy but not scary atmosphere, children's book illustration."
    },
    {
      "id": "scene1-oliver-success",
      "type": "cutscene",
      "filename": "scene1-oliver-success.png",
      "scene": "scene-1",
      "character": "oliver",
      "variant": "success",
      "prompt": "Generate a 16:9 landscape image. A 5-year-old boy hero with short slightly messy brown hair, brown eyes, rosy cheeks, wearing adventurer outfit with ORANGE accents, standing triumphantly with flames bursting from his raised fists..."
    }
  ]
}
```

## 6. Package Dependencies

Add to package.json:
```json
{
  "dependencies": {
    "@google-cloud/aiplatform": "^3.0.0"
  },
  "devDependencies": {
    "commander": "^11.0.0"  // For CLI argument parsing
  }
}
```

## 7. Setup Instructions Output

After creating the files, output a README section explaining:

1. How to create a Google Cloud project
2. How to enable Vertex AI API
3. How to create a service account with "Vertex AI User" role
4. How to download the JSON key
5. How to set the environment variables
6. How to run the first generation

## Notes

- Imagen 3 costs ~$0.04/image (vs Replicate Flux at $0.003-0.024)
- Imagen 3 Fast costs ~$0.02/image but slightly lower quality
- Consider adding a `--model fast` flag to use the cheaper model for testing
- The prompts were optimized for Flux but should work well with Imagen
- If Imagen struggles with character consistency, we may need to adjust prompts

## Validation

After implementation, test with:
```bash
# Generate just one image to verify setup
npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight --id prologue
```

Check that:
- Image saves to `/public/images/backgrounds/shadow-knight/prologue.png`
- Image is 16:9 aspect ratio
- Image is PNG format
- Style matches "Pixar-adjacent storybook"
- No text/watermarks in image

---

## END OF PROMPT

---

## After Claude Code Creates the Files

You'll need to:

1. **Create GCP Project & Enable Vertex AI:**
   - Go to https://console.cloud.google.com
   - Create new project or select existing
   - Enable "Vertex AI API" in APIs & Services

2. **Create Service Account:**
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Grant "Vertex AI User" role
   - Create JSON key and download

3. **Set Environment Variables:**
   Add to your `.env` file:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
   ```

4. **The prompts JSON is already in place:**
   ```
   ~/Projects/adventures/docs/shadow-knight-image-prompts.json
   ```

5. **Run first test:**
   ```bash
   npx ts-node src/scripts/generateAdventureImages.ts --adventure shadow-knight --id prologue --dry-run
   ```
