import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Reward } from '../types/adventure';
import PlaceholderImage from './PlaceholderImage';

const AUTO_DISMISS_MS = 6000;
const DISMISS_DELAY_MS = 2000;

// Animation timing (in ms from start)
const TIMING = {
  chestAppear: 0,
  chestOpen: 500,
  goldGlow: 600,
  rewardsStart: 800,
  rewardStagger: 150,
  textPop: 1400,
  confettiStart: 600,
};

/** Generate deterministic confetti positions */
function confettiData(n: number) {
  const out: { left: number; delay: number; color: string; shape: 'square' | 'circle' | 'triangle'; size: number }[] = [];
  const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];
  const shapes: ('square' | 'circle' | 'triangle')[] = ['square', 'circle', 'triangle'];
  
  for (let i = 0; i < n; i++) {
    const p = (i * 0.38197) % 1;
    const d = (i * 0.61803) % 1;
    out.push({
      left: p * 100,
      delay: d * 1.5,
      color: colors[i % colors.length],
      shape: shapes[i % shapes.length],
      size: 8 + (i % 4) * 4, // 8px to 20px
    });
  }
  return out;
}

/** Treasure Chest SVG with animated lid */
function TreasureChest({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative w-48 h-40">
      {/* Gold glow effect inside */}
      {isOpen && (
        <div 
          className="absolute inset-x-4 top-8 h-20 bg-gradient-radial from-yellow-300 via-amber-400 to-transparent rounded-full animate-gold-glow"
          style={{ background: 'radial-gradient(ellipse, #fcd34d 0%, #f59e0b 40%, transparent 70%)' }}
        />
      )}
      
      {/* Chest body */}
      <svg viewBox="0 0 200 160" className="w-full h-full" aria-hidden="true">
        {/* Chest base/body */}
        <rect x="20" y="70" width="160" height="80" rx="8" fill="#92400e" />
        <rect x="25" y="75" width="150" height="70" rx="6" fill="#b45309" />
        
        {/* Wood grain lines */}
        <line x1="30" y1="90" x2="170" y2="90" stroke="#92400e" strokeWidth="2" opacity="0.5" />
        <line x1="30" y1="110" x2="170" y2="110" stroke="#92400e" strokeWidth="2" opacity="0.5" />
        <line x1="30" y1="130" x2="170" y2="130" stroke="#92400e" strokeWidth="2" opacity="0.5" />
        
        {/* Metal bands */}
        <rect x="15" y="68" width="170" height="8" rx="2" fill="#78350f" />
        <rect x="15" y="145" width="170" height="8" rx="2" fill="#78350f" />
        <rect x="90" y="68" width="20" height="85" rx="2" fill="#78350f" />
        
        {/* Lock plate */}
        <rect x="85" y="95" width="30" height="25" rx="4" fill="#fbbf24" />
        <circle cx="100" cy="107" r="6" fill="#92400e" />
      </svg>
      
      {/* Animated lid - separate for transform */}
      <div 
        className={`absolute top-0 left-0 w-full ${isOpen ? 'animate-chest-open' : ''}`}
        style={{ transformOrigin: 'top center', perspective: '500px' }}
      >
        <svg viewBox="0 0 200 80" className="w-full" aria-hidden="true">
          {/* Lid */}
          <ellipse cx="100" cy="70" rx="85" ry="15" fill="#78350f" />
          <path 
            d="M 20 70 Q 20 20 100 15 Q 180 20 180 70 Z" 
            fill="#b45309"
          />
          <path 
            d="M 25 68 Q 25 25 100 20 Q 175 25 175 68 Z" 
            fill="#d97706"
          />
          
          {/* Lid metal band */}
          <path 
            d="M 30 65 Q 30 30 100 25 Q 170 30 170 65" 
            fill="none" 
            stroke="#78350f" 
            strokeWidth="6"
          />
          
          {/* Lid highlight */}
          <path 
            d="M 50 55 Q 50 40 100 38 Q 150 40 150 55" 
            fill="none" 
            stroke="#fbbf24" 
            strokeWidth="2"
            opacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

/** Confetti piece component */
function ConfettiPiece({ left, delay, color, shape, size }: { 
  left: number; 
  delay: number; 
  color: string; 
  shape: 'square' | 'circle' | 'triangle';
  size: number;
}) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-sm' : '';
  
  if (shape === 'triangle') {
    return (
      <div
        className="absolute animate-confetti-fall"
        style={{
          left: `${left}%`,
          top: '-20px',
          animationDelay: `${delay}s`,
          width: 0,
          height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${color}`,
        }}
      />
    );
  }
  
  return (
    <div
      className={`absolute animate-confetti-fall ${shapeClass}`}
      style={{
        left: `${left}%`,
        top: '-20px',
        width: size,
        height: size,
        backgroundColor: color,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

/** Sparkle effect */
function Sparkle({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <div 
      className="absolute animate-sparkle pointer-events-none"
      style={{ ...style, animationDelay: `${delay}s` }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path 
          d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" 
          fill="#fcd34d"
        />
      </svg>
    </div>
  );
}

/** Component for a single reward image with error fallback */
function RewardImage({ reward, large }: { reward: Reward; large?: boolean }) {
  const [error, setError] = useState(false);
  const sizeClass = large ? 'w-20 h-20' : 'w-16 h-16';

  if (!reward.imageUrl || error) {
    return (
      <PlaceholderImage
        variant="reward"
        label={reward.name}
        className={`${sizeClass} flex-shrink-0`}
      />
    );
  }

  return (
    <img
      src={reward.imageUrl}
      alt={reward.name}
      className={`${sizeClass} object-contain rounded-lg flex-shrink-0`}
      onError={() => setError(true)}
    />
  );
}

interface RewardCelebrationProps {
  rewards: Reward[];
  onClose: () => void;
  variant: 'scene' | 'ending';
}

export default function RewardCelebration({ rewards, onClose, variant }: RewardCelebrationProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [visibleRewards, setVisibleRewards] = useState<number[]>([]);
  const [showText, setShowText] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const isEnding = variant === 'ending';
  const ariaLabel = isEnding ? 'Adventure complete - rewards earned' : 'Scene rewards earned';
  const confetti = useMemo(() => confettiData(40), []);

  // Animation sequence
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Open chest
    timers.push(setTimeout(() => setChestOpen(true), TIMING.chestOpen));
    
    // Gold glow
    timers.push(setTimeout(() => setShowGlow(true), TIMING.goldGlow));
    
    // Show rewards one by one
    rewards.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleRewards(prev => [...prev, i]);
      }, TIMING.rewardsStart + i * TIMING.rewardStagger));
    });
    
    // Show announcement text
    timers.push(setTimeout(() => setShowText(true), TIMING.textPop));
    
    // Start confetti
    timers.push(setTimeout(() => setShowConfetti(true), TIMING.confettiStart));
    
    // Enable dismiss after delay
    timers.push(setTimeout(() => setCanDismiss(true), DISMISS_DELAY_MS));
    
    // Auto dismiss
    timers.push(setTimeout(onClose, AUTO_DISMISS_MS));

    return () => timers.forEach(clearTimeout);
  }, [onClose, rewards]);

  const handleDismiss = useCallback(() => {
    if (canDismiss) {
      onClose();
    }
  }, [canDismiss, onClose]);

  // Handle keyboard dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (canDismiss && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canDismiss, onClose]);

  const treasureText = rewards.length === 1 ? 'treasure' : 'treasures';
  const announcementText = isEnding 
    ? `Adventure Complete! You earned ${rewards.length} ${treasureText}!`
    : `You found ${rewards.length} ${treasureText}!`;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in ${
        isEnding 
          ? 'bg-gradient-to-br from-amber-900/90 via-orange-800/90 to-yellow-900/90' 
          : 'bg-black/70 backdrop-blur-sm'
      }`}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="true"
      onClick={handleDismiss}
      style={{ cursor: canDismiss ? 'pointer' : 'default' }}
    >
      {/* Confetti layer */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((c, i) => (
            <ConfettiPiece key={i} {...c} />
          ))}
        </div>
      )}

      {/* Sparkles around rewards area */}
      {showGlow && (
        <>
          <Sparkle style={{ top: '20%', left: '15%' }} delay={0} />
          <Sparkle style={{ top: '25%', right: '20%' }} delay={0.3} />
          <Sparkle style={{ top: '40%', left: '10%' }} delay={0.6} />
          <Sparkle style={{ top: '35%', right: '15%' }} delay={0.9} />
          <Sparkle style={{ bottom: '30%', left: '20%' }} delay={1.2} />
          <Sparkle style={{ bottom: '35%', right: '25%' }} delay={0.4} />
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 px-4">
        {/* Announcement text */}
        {showText && (
          <h2 
            className="text-3xl md:text-4xl font-bold text-white text-center animate-text-pop drop-shadow-lg"
            style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 4px 8px rgba(0,0,0,0.5)' }}
          >
            {announcementText}
          </h2>
        )}

        {/* Rewards display */}
        <div className="flex flex-wrap justify-center gap-4 max-w-md">
          {rewards.map((reward, i) => (
            <div
              key={reward.id}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/95 shadow-2xl border-2 border-amber-300 ${
                visibleRewards.includes(i) ? 'animate-reward-burst' : 'opacity-0'
              }`}
              style={{ 
                animationDelay: `${i * 0.15}s`,
                boxShadow: '0 0 30px rgba(251, 191, 36, 0.5), 0 10px 40px rgba(0,0,0,0.3)'
              }}
            >
              <div className="relative">
                <RewardImage reward={reward} large />
                {/* Glow behind image */}
                <div 
                  className="absolute inset-0 -z-10 rounded-lg blur-md bg-amber-400/50"
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 text-lg">{reward.name}</p>
                {reward.type && (
                  <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">
                    {reward.type}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Treasure chest */}
        <div className="animate-chest-bounce">
          <TreasureChest isOpen={chestOpen} />
        </div>

        {/* Tap hint (shown after delay) */}
        {canDismiss && (
          <p className="text-white/70 text-sm animate-fade-in">
            Tap anywhere to continue
          </p>
        )}
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {showText && (
          <>
            {announcementText}
            {rewards.map(r => r.name).join(', ')}
          </>
        )}
      </div>
    </div>
  );
}
