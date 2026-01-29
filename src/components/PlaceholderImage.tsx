interface PlaceholderImageProps {
  label: string;
  variant: 'character' | 'scene' | 'reward';
  className?: string;
}

/** Simple gem icon for reward placeholders */
function GemIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" aria-hidden="true">
      {/* Gem shape with facets */}
      <polygon
        points="32,4 56,24 48,58 16,58 8,24"
        fill={color}
        stroke="#fff"
        strokeWidth="2"
      />
      {/* Top facet highlight */}
      <polygon
        points="32,4 44,20 32,28 20,20"
        fill="#fff"
        fillOpacity="0.4"
      />
      {/* Left facet */}
      <polygon
        points="8,24 20,20 32,28 16,58"
        fill="#000"
        fillOpacity="0.15"
      />
      {/* Sparkle */}
      <circle cx="24" cy="16" r="3" fill="#fff" fillOpacity="0.8" />
    </svg>
  );
}

/** Badge/medal icon for reward placeholders */
function BadgeIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" aria-hidden="true">
      {/* Ribbon tails */}
      <polygon points="20,40 14,62 24,52 28,62 28,40" fill="#ef4444" />
      <polygon points="44,40 50,62 40,52 36,62 36,40" fill="#ef4444" />
      {/* Badge circle */}
      <circle cx="32" cy="28" r="22" fill={color} stroke="#fbbf24" strokeWidth="3" />
      {/* Inner star */}
      <polygon
        points="32,12 35,22 46,22 38,29 41,40 32,33 23,40 26,29 18,22 29,22"
        fill="#fbbf24"
      />
      {/* Highlight */}
      <circle cx="24" cy="18" r="4" fill="#fff" fillOpacity="0.4" />
    </svg>
  );
}

// Deterministic color based on label
function getRewardColor(label: string): string {
  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function PlaceholderImage({ label, variant, className = '' }: PlaceholderImageProps) {
  if (variant === 'reward') {
    const color = getRewardColor(label);
    const isBadge = label.toLowerCase().includes('badge') || label.toLowerCase().includes('medal');

    return (
      <div
        className={`bg-gradient-to-br from-amber-100 to-orange-100 flex flex-col items-center justify-center rounded-xl p-2 ${className}`}
      >
        {isBadge ? <BadgeIcon color={color} /> : <GemIcon color={color} />}
      </div>
    );
  }

  const bgColor = variant === 'character' ? 'bg-amber-200' : 'bg-violet-200';
  const defaultClasses = variant === 'scene' ? 'aspect-video w-full' : '';

  return (
    <div
      className={`${bgColor} flex items-center justify-center rounded-lg ${defaultClasses} ${className}`}
    >
      <p className="text-gray-900 font-medium text-center px-2">{label}</p>
    </div>
  );
}
