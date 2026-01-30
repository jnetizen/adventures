import { useState, useEffect, useRef } from 'react';
import type { CollectedReward } from '../types/game';
import PlaceholderImage from './PlaceholderImage';

interface CutsceneOverlayProps {
  /** URL of the cutscene image or video to display. */
  imageUrl: string;
  /** Outcome text (for screen readers, not displayed prominently). */
  outcomeText: string;
  /** Character name for accessibility. */
  characterName: string;
  /** Reward earned (if any). */
  reward?: CollectedReward;
}

/** Check if URL is a video file */
const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.endsWith(ext));
};

/**
 * Full-screen cutscene overlay displayed on kids' screen after a roll.
 * Shows the outcome illustration (image or video) with optional reward.
 * Controlled by DM - no dismiss button on this screen.
 */
export default function CutsceneOverlay({
  imageUrl,
  outcomeText,
  characterName,
  reward,
}: CutsceneOverlayProps) {
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = isVideoUrl(imageUrl);

  // Reset loading state when URL changes
  useEffect(() => {
    setMediaError(false);
    setMediaLoaded(false);
  }, [imageUrl]);

  // Auto-play video when loaded
  useEffect(() => {
    if (isVideo && videoRef.current && mediaLoaded) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's ok
      });
    }
  }, [isVideo, mediaLoaded]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black animate-fade-in"
      role="img"
      aria-label={`${characterName}'s outcome: ${outcomeText}`}
    >
      {/* Full-screen cutscene media */}
      <div className="absolute inset-0 flex items-center justify-center">
        {mediaError ? (
          <PlaceholderImage
            variant="scene"
            label={`${characterName}'s moment`}
            className="w-full h-full object-contain"
          />
        ) : isVideo ? (
          <video
            ref={videoRef}
            src={imageUrl}
            className={`w-full h-full object-contain transition-opacity duration-500 ${
              mediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedData={() => setMediaLoaded(true)}
            onError={() => setMediaError(true)}
            autoPlay
            playsInline
            muted={false}
          />
        ) : (
          <img
            src={imageUrl}
            alt={`${characterName}'s outcome`}
            className={`w-full h-full object-contain transition-opacity duration-500 ${
              mediaLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setMediaLoaded(true)}
            onError={() => setMediaError(true)}
          />
        )}
      </div>

      {/* Loading state */}
      {!mediaLoaded && !mediaError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
        </div>
      )}

      {/* Reward display at bottom (if reward earned) */}
      {reward && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-4 bg-white/95 rounded-2xl p-4 shadow-2xl animate-reward-burst">
              {reward.imageUrl ? (
                <img
                  src={reward.imageUrl}
                  alt={reward.name}
                  className="w-16 h-16 object-contain rounded-lg flex-shrink-0"
                />
              ) : (
                <PlaceholderImage
                  variant="character"
                  label={reward.name}
                  className="w-16 h-16 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  Treasure Found!
                </p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {reward.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {characterName}'s turn result: {outcomeText}
        {reward && `. Earned reward: ${reward.name}`}
      </div>
    </div>
  );
}
