import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu, Home, X } from 'lucide-react';
import { loadAdventure, getAdventureList } from '../lib/adventures';
import { adventureToBeats } from '../lib/storyBeats';
import { createStorySession, getStorySession, updateStoryBeatIndex } from '../lib/storySession';
import StoryBeatView from '../components/StoryBeatView';
import SceneSelectMenu from '../components/SceneSelectMenu';
import type { Adventure } from '../types/adventure';
import type { StorySession } from '../types/story';

export default function StoryDMPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const adventureIdParam = searchParams.get('adventure');

  // State
  const [session, setSession] = useState<StorySession | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSceneMenu, setShowSceneMenu] = useState(false);
  const [selectingAdventure, setSelectingAdventure] = useState(false);

  // Convert adventure to beats
  const beats = useMemo(
    () => (adventure ? adventureToBeats(adventure) : []),
    [adventure]
  );

  const currentBeat = beats[currentBeatIndex];
  const isFirstBeat = currentBeatIndex === 0;
  const isLastBeat = currentBeatIndex === beats.length - 1;
  const isSceneBeat = currentBeat?.type === 'scene';

  // Initialize: either resume session or show adventure picker
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);

      try {
        // Resuming existing session
        if (sessionId) {
          const { data: existingSession, error: sessionError } = await getStorySession(sessionId);
          if (sessionError || !existingSession) {
            setError('Session not found');
            setLoading(false);
            return;
          }

          const adv = await loadAdventure(existingSession.adventure_id);
          if (!adv) {
            setError('Adventure not found');
            setLoading(false);
            return;
          }

          setSession(existingSession);
          setAdventure(adv);
          setCurrentBeatIndex(existingSession.current_beat_index);
          setLoading(false);
          return;
        }

        // Starting new session with adventure param
        if (adventureIdParam) {
          const adv = await loadAdventure(adventureIdParam);
          if (!adv) {
            setError('Adventure not found');
            setLoading(false);
            return;
          }

          const { data: newSession, error: createError } = await createStorySession(adventureIdParam);
          if (createError || !newSession) {
            setError('Failed to create session');
            setLoading(false);
            return;
          }

          setSession(newSession);
          setAdventure(adv);
          setCurrentBeatIndex(0);

          // Update URL to include session ID for resumability
          navigate(`/story/dm/${newSession.id}`, { replace: true });
          setLoading(false);
          return;
        }

        // No session or adventure - show picker
        setSelectingAdventure(true);
        setLoading(false);
      } catch (e) {
        console.error('Story init error:', e);
        setError('Something went wrong');
        setLoading(false);
      }
    }

    init();
  }, [sessionId, adventureIdParam, navigate]);

  // Sync beat index to database
  const syncBeatIndex = useCallback(async (index: number) => {
    if (!session) return;
    await updateStoryBeatIndex(session.id, index);
  }, [session]);

  // Navigation handlers
  const goNext = useCallback(() => {
    // For scene beats, first show outcome, then advance
    if (isSceneBeat && !showOutcome && currentBeat.outcomeText) {
      setShowOutcome(true);
      return;
    }

    if (!isLastBeat) {
      const nextIndex = currentBeatIndex + 1;
      setCurrentBeatIndex(nextIndex);
      setShowOutcome(false);
      syncBeatIndex(nextIndex);
    }
  }, [currentBeatIndex, isLastBeat, isSceneBeat, showOutcome, currentBeat, syncBeatIndex]);

  const goBack = useCallback(() => {
    if (showOutcome) {
      setShowOutcome(false);
      return;
    }

    if (!isFirstBeat) {
      const prevIndex = currentBeatIndex - 1;
      setCurrentBeatIndex(prevIndex);
      setShowOutcome(false);
      syncBeatIndex(prevIndex);
    }
  }, [currentBeatIndex, isFirstBeat, showOutcome, syncBeatIndex]);

  const jumpToBeat = useCallback((index: number) => {
    setCurrentBeatIndex(index);
    setShowOutcome(false);
    setShowSceneMenu(false);
    syncBeatIndex(index);
  }, [syncBeatIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSceneMenu || selectingAdventure) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Escape') {
        setShowSceneMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goBack, showSceneMenu, selectingAdventure]);

  // Adventure selection screen
  if (selectingAdventure) {
    const adventures = getAdventureList();
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Choose a Story</h1>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {adventures.map(adv => (
              <button
                key={adv.id}
                onClick={() => navigate(`/story/dm?adventure=${adv.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-left hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-amber-100">
                  {adv.previewImageUrl ? (
                    <img
                      src={adv.previewImageUrl}
                      alt={adv.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-600">
                      No preview
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900">{adv.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{adv.tagline}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <span className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
          <p className="text-gray-700">Loading story...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/story/dm')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Choose Another Story
          </button>
        </div>
      </div>
    );
  }

  // Main story reader
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <button
          onClick={() => setShowSceneMenu(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-sm font-medium">Scenes</span>
        </button>

        <div className="text-center">
          {session && (
            <p className="text-xs text-amber-300">Room: {session.room_code}</p>
          )}
          <p className="text-sm text-gray-300">
            {currentBeatIndex + 1} / {beats.length}
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="Exit story"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Beat content */}
      <main className="flex-1 min-h-0 relative" onClick={goNext}>
        {currentBeat && (
          <StoryBeatView beat={currentBeat} showOutcome={showOutcome} />
        )}
      </main>

      {/* Navigation footer */}
      <footer className="flex items-center justify-between px-4 py-3 bg-gray-800">
        <button
          onClick={(e) => { e.stopPropagation(); goBack(); }}
          disabled={isFirstBeat && !showOutcome}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <p className="text-gray-400 text-sm">Tap anywhere to continue</p>

        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={isLastBeat && (!isSceneBeat || showOutcome || !currentBeat?.outcomeText)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500 transition-colors"
        >
          <span>{isLastBeat ? 'The End' : 'Next'}</span>
          {!isLastBeat && <ChevronRight className="w-5 h-5" />}
        </button>
      </footer>

      {/* Scene select menu */}
      {showSceneMenu && (
        <SceneSelectMenu
          beats={beats}
          currentBeatIndex={currentBeatIndex}
          onSelectBeat={jumpToBeat}
          onClose={() => setShowSceneMenu(false)}
        />
      )}
    </div>
  );
}
