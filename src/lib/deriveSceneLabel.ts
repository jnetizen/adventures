/**
 * Derive a readable label from a scene image URL.
 * Example: "/images/scenes/sugary-storm.png" -> "Sugary Storm"
 */
export function deriveSceneLabel(
  sceneImageUrl: string | undefined,
  sceneNumber?: number
): string {
  if (!sceneImageUrl) {
    return sceneNumber !== undefined ? `Scene ${sceneNumber + 1}` : 'Scene';
  }

  try {
    const filename = sceneImageUrl.split('/').pop() || '';
    const basename = filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    const words = basename.split('-');
    const titleCased = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return titleCased || `Scene ${sceneNumber !== undefined ? sceneNumber + 1 : ''}`;
  } catch {
    return sceneNumber !== undefined ? `Scene ${sceneNumber + 1}` : 'Scene';
  }
}
