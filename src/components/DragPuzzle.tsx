import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragPuzzleInstructions } from '../types/adventure';

interface DragPuzzleProps {
  /** Puzzle configuration from adventure JSON. */
  instructions: DragPuzzleInstructions;
  /** Called when puzzle is completed (success or after giving up). */
  onComplete: (success: boolean) => void;
  /** Scene background image URL. */
  sceneImageUrl?: string;
}

/** Individual draggable symbol item. */
function SortableSymbol({
  id,
  symbol,
  isWrong
}: {
  id: string;
  symbol: { name: string; imageUrl: string };
  isWrong: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if imageUrl is an emoji (short string without /)
  const isEmoji = symbol.imageUrl.length <= 4 && !symbol.imageUrl.includes('/');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex flex-col items-center justify-center
        w-20 h-24 md:w-24 md:h-28
        bg-white/90 backdrop-blur
        rounded-2xl shadow-lg
        border-4 border-amber-400
        cursor-grab active:cursor-grabbing
        touch-manipulation
        select-none
        transition-all duration-200
        ${isDragging ? 'scale-110 shadow-2xl z-50 rotate-3' : ''}
        ${isWrong ? 'animate-shake border-red-500' : ''}
      `}
    >
      {isEmoji ? (
        <span className="text-4xl md:text-5xl" role="img" aria-label={symbol.name}>
          {symbol.imageUrl}
        </span>
      ) : (
        <img
          src={symbol.imageUrl}
          alt={symbol.name}
          className="w-12 h-12 md:w-14 md:h-14 object-contain"
        />
      )}
      <span className="text-xs font-medium text-gray-700 mt-1 truncate max-w-full px-1">
        {symbol.name}
      </span>
    </div>
  );
}

/** Shuffle array (Fisher-Yates) */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function DragPuzzle({
  instructions,
  onComplete,
  sceneImageUrl,
}: DragPuzzleProps) {
  // Initialize with shuffled order (but ensure it's not already correct)
  const [symbolOrder, setSymbolOrder] = useState<string[]>(() => {
    let shuffled = shuffleArray(instructions.correctOrder);
    // Re-shuffle if accidentally correct
    while (shuffled.join(',') === instructions.correctOrder.join(',')) {
      shuffled = shuffleArray(instructions.correctOrder);
    }
    return shuffled;
  });

  const [attempts, setAttempts] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Touch-friendly sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get symbol data by ID
  const getSymbol = useCallback((id: string) => {
    return instructions.symbols.find(s => s.id === id) || { name: id, imageUrl: id };
  }, [instructions.symbols]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSymbolOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Check answer
  const checkAnswer = () => {
    setAttempts(prev => prev + 1);

    const isCorrect = symbolOrder.join(',') === instructions.correctOrder.join(',');

    if (isCorrect) {
      setIsSuccess(true);
      setShowConfetti(true);
      // Delay completion to show celebration
      setTimeout(() => {
        onComplete(true);
      }, 2000);
    } else {
      setIsWrong(true);
      // Clear wrong state after animation
      setTimeout(() => setIsWrong(false), 600);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-40 bg-gradient-to-b from-green-600 via-emerald-700 to-green-800 flex flex-col items-center justify-center">
        {/* Confetti effect */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  fontSize: `${20 + Math.random() * 20}px`,
                }}
              >
                {['⭐', '🎉', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-8xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Amazing!
        </h2>
        <p className="text-xl text-green-100">
          You solved the puzzle!
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-amber-600 via-orange-700 to-amber-800">
      {/* Background image */}
      {sceneImageUrl && (
        <div className="absolute inset-0">
          <img
            src={sceneImageUrl}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧩</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {instructions.prompt || 'Put these in the right order!'}
          </h2>
          <p className="text-amber-200 text-sm">
            Drag to rearrange
          </p>
        </div>

        {/* Puzzle area */}
        <div className="bg-black/30 backdrop-blur rounded-3xl p-4 md:p-6 mb-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={symbolOrder}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
                {symbolOrder.map((id) => (
                  <SortableSymbol
                    key={id}
                    id={id}
                    symbol={getSymbol(id)}
                    isWrong={isWrong}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Arrow indicators showing flow direction */}
        <div className="flex items-center gap-2 text-white/60 mb-6">
          <span className="text-sm">Start</span>
          <span className="text-2xl">→ → →</span>
          <span className="text-sm">End</span>
        </div>

        {/* Check answer button */}
        <button
          onClick={checkAnswer}
          disabled={isSuccess}
          className={`
            px-8 py-4 rounded-2xl
            text-xl font-bold
            transition-all duration-200
            ${isWrong
              ? 'bg-red-500 text-white'
              : 'bg-yellow-400 hover:bg-yellow-300 text-amber-900'
            }
            active:scale-95
            shadow-lg hover:shadow-xl
          `}
        >
          {isWrong ? 'Try Again!' : 'Check Answer'}
        </button>

        {/* Attempt counter */}
        {attempts > 0 && !isSuccess && (
          <p className="mt-4 text-amber-200 text-sm">
            Attempts: {attempts}
          </p>
        )}
      </div>
    </div>
  );
}
