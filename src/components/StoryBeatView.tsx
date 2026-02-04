import { useState } from 'react';
import type { StoryBeat } from '../types/story';
import PlaceholderImage from './PlaceholderImage';

interface StoryBeatViewProps {
  beat: StoryBeat;
  showOutcome?: boolean; // For scene beats, show outcome text after tap
}

/** Image with error fallback */
function StoryImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <PlaceholderImage variant="scene" label={alt} className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

export default function StoryBeatView({ beat, showOutcome }: StoryBeatViewProps) {
  // Prologue: World intro
  if (beat.type === 'prologue-world') {
    return (
      <div className="flex flex-col h-full">
        {beat.image && (
          <div className="flex-1 min-h-0">
            <StoryImage
              src={beat.image}
              alt="World"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 bg-gradient-to-t from-black/80 to-black/40 text-white">
          <p className="text-lg leading-relaxed">{beat.text}</p>
        </div>
      </div>
    );
  }

  // Prologue: Character intro
  if (beat.type === 'prologue-character') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-md text-center space-y-4">
          {beat.image && (
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-amber-300 shadow-lg">
              <StoryImage
                src={beat.image}
                alt={beat.characterName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h2 className="text-2xl font-bold text-amber-900">{beat.characterName}</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{beat.text}</p>
        </div>
      </div>
    );
  }

  // Prologue: All characters on one page
  if (beat.type === 'prologue-characters') {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="p-6 space-y-5 max-w-md mx-auto w-full">
          <h2 className="text-2xl font-bold text-amber-900 text-center">Meet Your Heroes</h2>
          {beat.characters.map((char) => (
            <div key={char.characterId} className="flex items-start gap-4 bg-white/70 rounded-xl p-4 shadow-sm">
              {char.image && (
                <div className="w-20 h-20 flex-shrink-0 rounded-full overflow-hidden border-3 border-amber-300 shadow">
                  <StoryImage
                    src={char.image}
                    alt={char.characterName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-amber-900">{char.characterName}</h3>
                <p className="text-sm text-gray-700 leading-relaxed mt-1">{char.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Prologue: Mission brief
  if (beat.type === 'prologue-mission') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="max-w-lg text-center space-y-4">
          <h2 className="text-2xl font-bold text-amber-300">Your Mission</h2>
          <p className="text-xl text-white leading-relaxed">{beat.text}</p>
        </div>
      </div>
    );
  }

  // Scene
  if (beat.type === 'scene') {
    return (
      <div className="relative h-full">
        {/* Scene image - full bleed */}
        <StoryImage
          src={beat.image}
          alt={`Scene ${beat.sceneIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Text overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Scene indicator */}
            <p className="text-amber-300 text-sm font-medium">
              Scene {beat.sceneIndex + 1} of {beat.sceneCount}
            </p>

            {/* Narration */}
            <p className="text-white text-lg leading-relaxed">{beat.narration}</p>

            {/* Outcome text (shown after tap) */}
            {showOutcome && beat.outcomeText && (
              <p className="text-amber-100 text-lg leading-relaxed pt-2 border-t border-white/20">
                {beat.outcomeText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Ending
  if (beat.type === 'ending') {
    return (
      <div className="relative h-full">
        {/* Background image or gradient */}
        {beat.image ? (
          <StoryImage
            src={beat.image}
            alt="Ending"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500" />
        )}

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/40">
          <div className="max-w-lg text-center space-y-6">
            <h1 className="text-4xl font-bold text-amber-300 drop-shadow-lg">
              {beat.title}
            </h1>
            <p className="text-xl text-white leading-relaxed drop-shadow">
              {beat.text}
            </p>

            {/* Rewards preview */}
            {beat.rewards.length > 0 && (
              <div className="pt-4">
                <p className="text-amber-200 text-sm mb-3">Treasures Earned:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {beat.rewards.map(reward => (
                    <span
                      key={reward.id}
                      className="px-3 py-1 bg-white/20 rounded-full text-white text-sm"
                    >
                      {reward.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <p className="text-gray-500">Unknown beat type</p>
    </div>
  );
}
