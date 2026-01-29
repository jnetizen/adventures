import { useState } from 'react';
import { X, BookOpen, Flag } from 'lucide-react';
import type { StoryBeat } from '../types/story';
import { getStoryStructure } from '../lib/storyBeats';

interface SceneSelectMenuProps {
  beats: StoryBeat[];
  currentBeatIndex: number;
  onSelectBeat: (beatIndex: number) => void;
  onClose: () => void;
}

/** Scene thumbnail with error fallback */
function SceneThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
        <span className="text-xs text-gray-500">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-16 h-12 object-cover rounded"
      onError={() => setError(true)}
    />
  );
}

export default function SceneSelectMenu({
  beats,
  currentBeatIndex,
  onSelectBeat,
  onClose,
}: SceneSelectMenuProps) {
  const structure = getStoryStructure(beats);
  const currentSceneIndex = beats[currentBeatIndex]?.type === 'scene'
    ? (beats[currentBeatIndex] as Extract<StoryBeat, { type: 'scene' }>).sceneIndex
    : -1;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Menu panel */}
      <div className="relative w-72 max-w-[80vw] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">Jump to Scene</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scene list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Prologue */}
          {structure.prologueBeatCount > 0 && (
            <button
              onClick={() => onSelectBeat(0)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                currentBeatIndex < structure.prologueBeatCount
                  ? 'bg-amber-100 text-amber-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="w-16 h-12 bg-gradient-to-br from-amber-200 to-orange-200 rounded flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">Prologue</p>
                <p className="text-xs text-gray-500">
                  {structure.prologueBeatCount} {structure.prologueBeatCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
              {currentBeatIndex < structure.prologueBeatCount && (
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          )}

          {/* Scenes */}
          {structure.scenes.map((scene, i) => (
            <button
              key={scene.sceneIndex}
              onClick={() => onSelectBeat(scene.beatIndex)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                currentSceneIndex === scene.sceneIndex
                  ? 'bg-blue-100 text-blue-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              <SceneThumbnail src={scene.image} alt={`Scene ${i + 1}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">Scene {i + 1}</p>
              </div>
              {currentSceneIndex === scene.sceneIndex && (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          ))}

          {/* Ending */}
          {structure.endingBeatIndex >= 0 && (
            <button
              onClick={() => onSelectBeat(structure.endingBeatIndex)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                currentBeatIndex === structure.endingBeatIndex
                  ? 'bg-green-100 text-green-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="w-16 h-12 bg-gradient-to-br from-green-200 to-emerald-200 rounded flex items-center justify-center">
                <Flag className="w-6 h-6 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Ending</p>
              </div>
              {currentBeatIndex === structure.endingBeatIndex && (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            {currentBeatIndex + 1} of {beats.length} pages
          </p>
        </div>
      </div>
    </div>
  );
}
