import { useState, useEffect, useRef } from 'react';
import type { CollectedReward } from '../types/game';
import PlaceholderImage from './PlaceholderImage';

/** Mini Treasure Chest SVG for reward display */
function MiniTreasureChest({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative w-20 h-16 flex-shrink-0">
      {/* Gold glow effect inside */}
      {isOpen && (
        <div
          className="absolute inset-x-1 top-2 h-8 rounded-full animate-gold-glow"
          style={{ background: 'radial-gradient(ellipse, #fcd34d 0%, #f59e0b 40%, transparent 70%)' }}
        />
      )}

      {/* Chest body */}
      <svg viewBox="0 0 100 80" className="w-full h-full" aria-hidden="true">
        {/* Chest base/body */}
        <rect x="10" y="35" width="80" height="40" rx="4" fill="#92400e" />
        <rect x="13" y="38" width="74" height="34" rx="3" fill="#b45309" />

        {/* Wood grain lines */}
        <line x1="15" y1="48" x2="85" y2="48" stroke="#92400e" strokeWidth="1.5" opacity="0.5" />
        <line x1="15" y1="58" x2="85" y2="58" stroke="#92400e" strokeWidth="1.5" opacity="0.5" />

        {/* Metal bands */}
        <rect x="8" y="34" width="84" height="4" rx="1" fill="#78350f" />
        <rect x="8" y="72" width="84" height="4" rx="1" fill="#78350f" />
        <rect x="45" y="34" width="10" height="42" rx="1" fill="#78350f" />

        {/* Lock plate */}
        <rect x="42" y="48" width="16" height="12" rx="2" fill="#fbbf24" />
        <circle cx="50" cy="54" r="3" fill="#92400e" />
      </svg>

      {/* Animated lid */}
      <div
        className={`absolute top-0 left-0 w-full transition-transform duration-500 ${isOpen ? 'animate-chest-open' : ''}`}
        style={{ transformOrigin: 'top center' }}
      >
        <svg viewBox="0 0 100 40" className="w-full" aria-hidden="true">
          {/* Lid */}
          <ellipse cx="50" cy="35" rx="42" ry="8" fill="#78350f" />
          <path
            d="M8 35 Q8 10 50 10 Q92 10 92 35"
            fill="#b45309"
            stroke="#78350f"
            strokeWidth="2"
          />
          {/* Lid highlight */}
          <path
            d="M20 30 Q20 18 50 18 Q80 18 80 30"
            fill="#d97706"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}

/** Generate sparkle positions */
function generateSparkles(count: number) {
  const sparkles = [];
  for (let i = 0; i < count; i++) {
    sparkles.push({
      left: `${(i * 37) % 100}%`,
      top: `${(i * 61) % 100}%`,
      delay: `${(i * 0.15) % 1}s`,
      size: 4 + (i % 3) * 2,
    });
  }
  return sparkles;
}

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
  // Track loaded/error state per URL to reset when URL changes
  const [loadState, setLoadState] = useState<{url: string; loaded: boolean; error: boolean}>({
    url: imageUrl,
    loaded: false,
    error: false,
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = isVideoUrl(imageUrl);

  // Derive current state - if URL changed, treat as not loaded/no error
  const mediaLoaded = loadState.url === imageUrl && loadState.loaded;
  const mediaError = loadState.url === imageUrl && loadState.error;

  const setMediaLoaded = (loaded: boolean) => {
    setLoadState({ url: imageUrl, loaded, error: false });
  };

  const setMediaError = (error: boolean) => {
    setLoadState({ url: imageUrl, loaded: false, error });
  };

  // Auto-play video when loaded, then unmute
  // Strategy: Start muted for autoplay (browser requirement), unmute after playback starts
  useEffect(() => {
    if (isVideo && videoRef.current && mediaLoaded) {
      const video = videoRef.current;
      video.play()
        .then(() => {
          // Playback started - unmute now that user has interacted with page
          video.muted = false;
          console.log('[VIDEO] Unmuted after autoplay started');
        })
        .catch(() => {
          // Autoplay blocked - keep muted, user can unmute via controls
          console.log('[VIDEO] Autoplay blocked, staying muted');
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
            onLoadedData={() => {
              console.log('[VIDEO] Loaded:', imageUrl);
              setMediaLoaded(true);
            }}
            onError={(e) => {
              console.error('[VIDEO] Error loading:', imageUrl, e);
              setMediaError(true);
            }}
            onPlay={() => console.log('[VIDEO] Playing')}
            autoPlay
            playsInline
            muted
            controls
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

      {/* Treasure chest reward display (if reward earned) */}
      {reward && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Sparkles around the reward area */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {generateSparkles(12).map((sparkle, i) => (
              <div
                key={i}
                className="absolute animate-sparkle"
                style={{
                  left: sparkle.left,
                  top: sparkle.top,
                  animationDelay: sparkle.delay,
                }}
              >
                <svg
                  width={sparkle.size}
                  height={sparkle.size}
                  viewBox="0 0 10 10"
                  className="text-yellow-300"
                >
                  <polygon
                    points="5,0 6,4 10,5 6,6 5,10 4,6 0,5 4,4"
                    fill="currentColor"
                  />
                </svg>
              </div>
            ))}
          </div>

          <div className="max-w-md mx-auto animate-chest-bounce">
            {/* Treasure chest with reward */}
            <div
              className="flex items-center gap-4 bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100 rounded-2xl p-4 shadow-2xl border-2 border-amber-400"
              style={{ boxShadow: '0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.3)' }}
            >
              {/* Mini treasure chest */}
              <MiniTreasureChest isOpen={true} />

              {/* Reward item bursting out */}
              <div className="flex-1 flex items-center gap-3 animate-reward-burst" style={{ animationDelay: '0.3s' }}>
                {reward.imageUrl ? (
                  <img
                    src={reward.imageUrl}
                    alt={reward.name}
                    className="w-14 h-14 object-contain rounded-lg flex-shrink-0 drop-shadow-lg"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' }}
                  />
                ) : (
                  <PlaceholderImage
                    variant="character"
                    label={reward.name}
                    className="w-14 h-14 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider animate-text-pop" style={{ animationDelay: '0.5s' }}>
                    ✨ Treasure Found! ✨
                  </p>
                  <p className="text-lg font-bold text-amber-900 truncate">
                    {reward.name}
                  </p>
                </div>
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
