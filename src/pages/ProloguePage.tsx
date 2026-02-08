import { useState } from 'react';
import type { Adventure } from '../types/adventure';
import PlaceholderImage from '../components/PlaceholderImage';

interface ProloguePageProps {
  adventure: Adventure;
  onStart: () => void;
  disabled?: boolean;
}

export default function ProloguePage({ adventure, onStart, disabled }: ProloguePageProps) {
  const prologue = adventure.prologue;
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const getCharacter = (characterId: string) =>
    adventure.characters.find((c) => c.id === characterId);

  // Video takes precedence over image
  const showVideo = prologue.prologueVideoUrl && !videoError;
  const showImage = !showVideo && prologue.prologueImageUrl && !imageError;
  const showPlaceholder = !showVideo && prologue.prologueImageUrl && imageError;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">{adventure.title}</h1>

        {/* Prologue Video - World reveal animation */}
        {showVideo && (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <video
              src={prologue.prologueVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto object-cover"
              onError={() => setVideoError(true)}
            />
          </div>
        )}

        {/* Prologue Image - World reveal before characters */}
        {showImage && (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img
              src={prologue.prologueImageUrl}
              alt={`The world of ${adventure.title}`}
              className="w-full h-auto object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {showPlaceholder && (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <PlaceholderImage
              variant="scene"
              label={`${adventure.title} World`}
              className="w-full aspect-video"
            />
          </div>
        )}

        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
            The World
          </h2>
          <p className="text-lg text-gray-800 leading-relaxed">{prologue.worldIntro}</p>
        </section>

        {prologue.characterIntros && prologue.characterIntros.length > 0 && (
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
            The Heroes
          </h2>
          <div className="space-y-4">
            {prologue.characterIntros.map((intro) => {
              const char = getCharacter(intro.characterId);
              if (!char) return null;
              return (
                <div
                  key={intro.characterId}
                  className="flex gap-4 items-start p-3 rounded-lg bg-amber-50/50"
                >
                  <div className="flex-shrink-0">
                    {char.imageUrl ? (
                      <img
                        src={char.imageUrl}
                        alt={char.name}
                        className="w-14 h-14 rounded-lg object-cover"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <PlaceholderImage
                      variant="character"
                      label={char.name}
                      className={`w-14 h-14 ${char.imageUrl ? 'hidden' : ''}`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{char.name}</p>
                    <p className="text-gray-700 leading-relaxed mt-1">{intro.introText}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {prologue.missionBrief && (
        <section className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
            Your Mission
          </h2>
          <p className="text-lg text-gray-800 leading-relaxed">{prologue.missionBrief}</p>
        </section>
        )}

        {adventure.dmNotes && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <h2 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Voice & Tips</h2>
            {adventure.dmNotes.voiceGuide && <p className="text-sm text-amber-900">{adventure.dmNotes.voiceGuide}</p>}
            {adventure.dmNotes.pacing && <p className="text-sm text-amber-800">{adventure.dmNotes.pacing}</p>}
            {adventure.dmNotes.diceNote && <p className="text-sm text-amber-800">{adventure.dmNotes.diceNote}</p>}
          </section>
        )}

        <div className="flex justify-center pt-4">
          <button
            onClick={onStart}
            disabled={disabled}
            className="w-full max-w-md bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-colors text-lg"
          >
            Start Adventure
          </button>
        </div>
      </div>
    </div>
  );
}
