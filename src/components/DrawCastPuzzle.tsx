import { useState, useCallback, useRef, useEffect } from 'react';
import type { DrawCastPuzzleInstructions } from '../types/adventure';

interface DrawCastPuzzleProps {
  instructions: DrawCastPuzzleInstructions;
  onComplete: (success: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Draw to Cast puzzle - trace a magical rune to cast a spell.
 * Player draws on the screen following a guide shape.
 * Kid-friendly: very forgiving, always succeeds (Blot helps if needed).
 */
export default function DrawCastPuzzle({ instructions, onComplete }: DrawCastPuzzleProps) {
  const completedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const pathPoints = useRef<Point[]>([]);
  const lastFeedbackProgress = useRef(0);

  const { rune, encouragement, successThreshold } = instructions;
  const glowColor = rune.glowColor === 'orange' ? '#f97316' : '#a855f7';

  // Generate guide path for spiral-into-star shape
  const generateGuidePath = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.35;

    ctx.beginPath();
    ctx.strokeStyle = `${glowColor}40`;
    ctx.lineWidth = rune.strokeWidth + 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw a spiral that ends in a star-ish pattern
    const points = 100;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const angle = t * Math.PI * 4; // 2 full rotations
      const radius = size * (0.2 + t * 0.8);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }, [glowColor, rune.strokeWidth]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Draw guide
    if (showGuide) {
      generateGuidePath(ctx, canvas);
    }
  }, [generateGuidePath, showGuide]);

  // Calculate progress based on path coverage
  const calculateProgress = useCallback(() => {
    const points = pathPoints.current;
    if (points.length < 10) return 0;

    // Simple progress based on area covered and path length
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate how spread out the drawing is
    let maxDistance = 0;
    let totalDistance = 0;

    for (let i = 1; i < points.length; i++) {
      const dist = Math.sqrt(
        Math.pow(points[i].x - points[i - 1].x, 2) +
        Math.pow(points[i].y - points[i - 1].y, 2)
      );
      totalDistance += dist;

      const fromCenter = Math.sqrt(
        Math.pow(points[i].x - centerX, 2) +
        Math.pow(points[i].y - centerY, 2)
      );
      maxDistance = Math.max(maxDistance, fromCenter);
    }

    // Progress based on path length and coverage
    const lengthProgress = Math.min(totalDistance / 800, 1);
    const coverageProgress = Math.min(maxDistance / (rect.width * 0.3), 1);

    return Math.min((lengthProgress * 0.6 + coverageProgress * 0.4) * 100, 100);
  }, []);

  // Handle drawing
  const handleDrawStart = useCallback((x: number, y: number) => {
    if (isComplete) return;
    setIsDrawing(true);
    setShowGuide(false);
    pathPoints.current = [{ x, y }];

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = rune.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 20;
      ctx.shadowColor = glowColor;
    }
  }, [isComplete, glowColor, rune.strokeWidth]);

  const handleDrawMove = useCallback((x: number, y: number) => {
    if (!isDrawing || isComplete) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    pathPoints.current.push({ x, y });
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Add sparkle particles
    if (Math.random() > 0.7) {
      ctx.save();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Update progress
    const newProgress = calculateProgress();
    setProgress(newProgress);

    // Check for encouragement
    if (encouragement) {
      for (const enc of encouragement) {
        if (newProgress >= enc.atPercent && lastFeedbackProgress.current < enc.atPercent) {
          setFeedback(enc.text);
          lastFeedbackProgress.current = newProgress;
          setTimeout(() => setFeedback(null), 2000);
          break;
        }
      }
    }
  }, [isDrawing, isComplete, calculateProgress, encouragement, glowColor]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing || completedRef.current) return;
    setIsDrawing(false);

    const finalProgress = calculateProgress();
    setProgress(finalProgress);

    // Check if complete (very forgiving threshold)
    if (finalProgress >= successThreshold.minPercentComplete || pathPoints.current.length > 50) {
      setIsComplete(true);
      setFeedback('Perfect!');
      setTimeout(() => {
        completedRef.current = true;
        onComplete(true);
      }, 2000);
    } else if (finalProgress > 30) {
      // Give another try with encouragement
      setFeedback('Keep going! Try again!');
      setTimeout(() => {
        setFeedback(null);
        setShowGuide(true);
      }, 1500);
    }
  }, [isDrawing, calculateProgress, successThreshold.minPercentComplete, onComplete]);

  // Auto-complete if struggling (Blot helps!)
  useEffect(() => {
    if (isComplete || completedRef.current) return;

    const helpTimer = setTimeout(() => {
      if (!completedRef.current && !isComplete) {
        setFeedback("Blot helps trace the rune!");
        setIsComplete(true);
        setTimeout(() => {
          completedRef.current = true;
          onComplete(true);
        }, 2000);
      }
    }, 30000); // After 30 seconds, auto-succeed

    return () => clearTimeout(helpTimer);
  }, [isComplete, onComplete]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-orange-900 via-amber-800 to-orange-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-white mb-2">
          {isComplete ? 'Spell Cast!' : 'Trace the Rune!'}
        </h2>
        <p className="text-orange-200">
          {!isComplete && 'Draw boldly with your finger!'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-4 bg-orange-950 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 px-6 py-3 rounded-full text-xl font-bold ${
          isComplete ? 'bg-green-500 text-white animate-bounce' : 'bg-yellow-400 text-yellow-900'
        }`}>
          {feedback}
        </div>
      )}

      {/* Drawing canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-80 h-80 rounded-3xl bg-orange-950/50 touch-none cursor-crosshair"
          style={{
            boxShadow: `0 0 40px ${glowColor}40, inset 0 0 40px ${glowColor}20`,
          }}
          onMouseDown={(e) => {
            const coords = getCanvasCoords(e);
            handleDrawStart(coords.x, coords.y);
          }}
          onMouseMove={(e) => {
            const coords = getCanvasCoords(e);
            handleDrawMove(coords.x, coords.y);
          }}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            const coords = getCanvasCoords(e);
            handleDrawStart(coords.x, coords.y);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const coords = getCanvasCoords(e);
            handleDrawMove(coords.x, coords.y);
          }}
          onTouchEnd={handleDrawEnd}
        />

        {/* Guide overlay text */}
        {showGuide && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-orange-300 text-lg font-medium bg-orange-950/70 px-4 py-2 rounded-lg">
              Start drawing here!
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-orange-200 text-sm">
          {isDrawing ? 'Keep going!' : 'Draw a spiral pattern'}
        </p>
      </div>

      {/* Blot helper indicator */}
      <div className="absolute bottom-8 right-8 text-4xl animate-bounce">
        🫧
      </div>

      {/* Success celebration */}
      {isComplete && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">🔥</div>
            <p className="text-4xl font-bold text-white">Powerful!</p>
          </div>
        </div>
      )}
    </div>
  );
}
