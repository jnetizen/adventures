interface AnimationIndicatorProps {
  animationKey?: string;
  className?: string;
}

/**
 * Visual indicator for animation keys.
 * Maps animationKey values to simple visual cues (icons, colors, or text).
 */
export default function AnimationIndicator({ animationKey, className = '' }: AnimationIndicatorProps) {
  if (!animationKey) return null;

  // Map animation keys to visual indicators
  const getIndicator = (key: string) => {
    const keyLower = key.toLowerCase();
    
    // Magic/sparkle themes
    if (keyLower.includes('sparkle') || keyLower.includes('magic') || keyLower.includes('fireworks')) {
      return <span className="text-yellow-500">✨</span>;
    }
    // Shield/protection
    if (keyLower.includes('shield') || keyLower.includes('safety')) {
      return <span className="text-blue-500">🛡️</span>;
    }
    // Freeze/cold
    if (keyLower.includes('freeze') || keyLower.includes('frost') || keyLower.includes('cool')) {
      return <span className="text-cyan-500">❄️</span>;
    }
    // Climb/movement
    if (keyLower.includes('climb') || keyLower.includes('bridge') || keyLower.includes('float')) {
      return <span className="text-green-500">🧗</span>;
    }
    // Web/vines
    if (keyLower.includes('web') || keyLower.includes('vines') || keyLower.includes('rope')) {
      return <span className="text-purple-500">🕸️</span>;
    }
    // Success/positive
    if (keyLower.includes('success') || keyLower.includes('open') || keyLower.includes('dance')) {
      return <span className="text-green-500">🎉</span>;
    }
    // Silly/funny
    if (keyLower.includes('silly') || keyLower.includes('bonk') || keyLower.includes('giggle')) {
      return <span className="text-orange-500">😄</span>;
    }
    // Dragon/crystal
    if (keyLower.includes('dragon') || keyLower.includes('crystal')) {
      return <span className="text-red-500">🐉</span>;
    }
    // Default sparkle
    return <span className="text-gray-500">⭐</span>;
  };

  return (
    <span className={`inline-flex items-center ${className}`} title={`Animation: ${animationKey}`}>
      {getIndicator(animationKey)}
    </span>
  );
}
