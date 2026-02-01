/**
 * Full-screen overlay for physical world puzzle scenes.
 * Displays the challenge text for the player to complete in the real world.
 * No interactive controls - DM confirms completion from their screen.
 */

interface PhysicalPuzzleOverlayProps {
  /** The challenge text to display prominently. */
  challenge: string;
  /** Background image URL for the scene. */
  sceneImageUrl?: string;
  /** Optional scene title. */
  title?: string;
}

export default function PhysicalPuzzleOverlay({
  challenge,
  sceneImageUrl,
  title,
}: PhysicalPuzzleOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-purple-900 via-indigo-900 to-purple-950">
      {/* Background scene image with overlay */}
      {sceneImageUrl && (
        <div className="absolute inset-0">
          <img
            src={sceneImageUrl}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>
      )}

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full p-6 text-center">
        {/* Decorative top element */}
        <div className="mb-8">
          <div className="text-6xl animate-bounce">
            <span role="img" aria-label="challenge">
              &#x1F3AF;
            </span>
          </div>
        </div>

        {/* Title (if provided) */}
        {title && (
          <h2 className="text-2xl font-bold text-purple-200 mb-4 uppercase tracking-wider">
            {title}
          </h2>
        )}

        {/* Main challenge card */}
        <div className="max-w-lg w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
            {/* "Your Challenge" header */}
            <div className="text-sm font-bold text-yellow-300 uppercase tracking-widest mb-4">
              Your Challenge
            </div>

            {/* Challenge text */}
            <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
              {challenge}
            </p>
          </div>
        </div>

        {/* Waiting indicator */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-purple-200 text-sm">
            Complete the challenge and wait for the DM!
          </p>
        </div>
      </div>
    </div>
  );
}
