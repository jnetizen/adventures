/**
 * Runtime image URL resolver for multi-family image support.
 *
 * When a session has a `family_slug`, image paths from the adventure JSON
 * are rewritten to point at Supabase Storage instead of the local /public folder.
 *
 * Storage layout:  family-images/{family_slug}/{adventure_id}/{filename}
 * Example:         family-images/jenny-family/wizards-library/scene-1-main.png
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function getStorageBase(): string {
  if (!SUPABASE_URL) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/family-images`;
}

/**
 * Resolves a single image/video path.
 *
 * - If no familySlug → returns the original path unchanged (backward compatible).
 * - If the path is already an absolute URL → returns it unchanged (idempotent).
 * - Otherwise rewrites:  /images/scenes/frozen-volcano/scene-1.png
 *                     → {storage}/jenny-family/frozen-volcano/scene-1.png
 */
export function resolveImageUrl(
  originalPath: string,
  familySlug: string | null | undefined,
  adventureId: string | null | undefined
): string {
  // No family slug = use original paths (backward compatible)
  if (!familySlug || !adventureId) return originalPath;

  // Already an absolute URL (e.g. already resolved, or an external URL)
  if (originalPath.startsWith('http://') || originalPath.startsWith('https://')) {
    return originalPath;
  }

  // Only transform local asset paths
  if (!originalPath.startsWith('/images/') && !originalPath.startsWith('/videos/')) {
    return originalPath;
  }

  // Extract just the filename from the full path
  const filename = originalPath.split('/').pop();
  if (!filename) return originalPath;

  const storageBase = getStorageBase();
  if (!storageBase) return originalPath;

  // Uploaded images are compressed to JPEG — swap .png extension
  const remoteFilename = filename.replace(/\.png$/, '.jpg');

  return `${storageBase}/${familySlug}/${adventureId}/${remoteFilename}`;
}

/**
 * Deep-transforms all image/video URLs in an adventure object.
 *
 * Uses JSON round-trip with a reviver to catch every string value that
 * looks like a local asset path (/images/... or /videos/...), regardless
 * of which field it lives on. This covers all 15+ image URL fields:
 *   sceneImageUrl, cutsceneImageUrl, prologueImageUrl, previewImageUrl,
 *   climaxVideoUrl, prologueVideoUrl, imageUrl (characters, rewards,
 *   endings, puzzles), endingImageUrl, videoUrl, etc.
 */
export function resolveAdventureImages<T>(
  adventureData: T,
  familySlug: string | null | undefined,
  adventureId: string | null | undefined
): T {
  // No family slug = pass through unchanged
  if (!familySlug || !adventureId) return adventureData;

  const json = JSON.stringify(adventureData);
  return JSON.parse(json, (_key, value) => {
    if (
      typeof value === 'string' &&
      (value.startsWith('/images/') || value.startsWith('/videos/'))
    ) {
      return resolveImageUrl(value, familySlug, adventureId);
    }
    return value;
  });
}
