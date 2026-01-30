# Image Generation Learnings

Documentation of our findings from testing various AI image generation models for Quest Family adventure illustrations.

## Requirements

- Generate children's book style illustrations
- Characters include children (ages 3-7) in fantasy settings
- Pixar-adjacent storybook style
- 16:9 aspect ratio for backgrounds and cutscenes

## Models Tested

### Failed Models

#### Vertex AI Imagen 3
- **Models:** `imagen-3.0-generate-001`, `imagen-3.0-fast-generate-001`
- **Package:** `@google-cloud/aiplatform`
- **Auth:** Service account JSON key
- **Result:** BLOCKED
- **Issue:** Content policy blocks generation of images containing children/minors, even for legitimate children's book illustrations
- **Error:** Returns empty predictions array (no error message, just silent failure)
- **Notes:**
  - Worked fine for landscape-only prompts (e.g., prologue scene with no characters)
  - Any prompt mentioning children with ages or describing young characters fails silently
  - No way to get an exception for children's media creators

#### Gemini 2.0 Flash Experimental
- **Model:** `gemini-2.0-flash-exp`
- **Result:** MODEL NOT FOUND
- **Issue:** Model ID was incorrect - this is not an image generation model
- **Error:** `404 Not Found - models/gemini-2.0-flash-exp is not found for API version v1beta`

### Working Models

#### Gemini 2.0 Flash Image Generation
- **Model:** `gemini-2.0-flash-exp-image-generation`
- **Package:** `@google/generative-ai`
- **Auth:** `GOOGLE_API_KEY` (free tier available)
- **Result:** SUCCESS
- **Quality:** Good
- **Cost:** ~$0.001/image (very cheap)
- **Notes:**
  - Successfully generates children characters
  - Handles complex multi-character scenes
  - Good style consistency with "Pixar-adjacent storybook" prompts

#### Gemini 3 Pro Image Preview
- **Model:** `gemini-3-pro-image-preview`
- **Package:** `@google/generative-ai`
- **Auth:** `GOOGLE_API_KEY`
- **Result:** SUCCESS
- **Quality:** Better than 2.0 Flash
- **Notes:**
  - Higher quality output
  - Better detail rendering
  - Preview model - may change

#### Gemini 2.5 Flash Image (RECOMMENDED)
- **Model:** `gemini-2.5-flash-image`
- **Package:** `@google/generative-ai`
- **Auth:** `GOOGLE_API_KEY`
- **Result:** SUCCESS
- **Quality:** Best balance of quality and speed
- **Cost:** Very low
- **Notes:**
  - Best overall results for our use case
  - Good character consistency
  - Handles positioning instructions well ("NOT overlapping, NOT touching")
  - Fast generation time
  - This is what we use in production

## API Comparison

| Model | Package | Auth Method | Children OK | Quality | Cost |
|-------|---------|-------------|-------------|---------|------|
| Imagen 3 | @google-cloud/aiplatform | Service Account | NO | N/A | $0.04/img |
| Imagen 3 Fast | @google-cloud/aiplatform | Service Account | NO | N/A | $0.02/img |
| Gemini 2.0 Flash Image | @google/generative-ai | API Key | YES | Good | ~$0.001/img |
| Gemini 3 Pro Preview | @google/generative-ai | API Key | YES | Better | ~$0.001/img |
| Gemini 2.5 Flash Image | @google/generative-ai | API Key | YES | Best | ~$0.001/img |

## Key Learnings

1. **Vertex AI Imagen has strict content policies** - Cannot generate images of children even for legitimate use cases. No workaround found.

2. **Gemini API is more permissive** - Allows children's book illustrations without issues.

3. **Use API key auth, not service accounts** - The Gemini API uses simple API keys which are easier to manage than GCP service accounts.

4. **Model naming matters** - `gemini-2.0-flash-exp` is NOT the same as `gemini-2.0-flash-exp-image-generation`. Check exact model IDs.

5. **List available models first** - Use the API to list models before assuming a model name:
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" | grep image
   ```

6. **Positioning instructions help** - Adding explicit instructions like "spread apart", "NOT overlapping", "NOT touching" helps with multi-character scenes.

7. **Style consistency** - Using consistent style descriptors ("Pixar-adjacent storybook style, soft painterly rendering, children's book illustration") helps maintain visual consistency across images.

## Implementation

See `/src/services/imageGeneration.ts` for the Gemini API implementation.

CLI usage:
```bash
# Generate all images for an adventure
npm run generate-images -- --adventure shadow-knight

# Generate only backgrounds
npm run generate-images -- --adventure shadow-knight --type backgrounds

# Generate single image
npm run generate-images -- --adventure shadow-knight --id prologue

# Dry run
npm run generate-images -- --adventure shadow-knight --dry-run
```
