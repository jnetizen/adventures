import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadAdventure } from '../lib/adventures';
import { adventureToBeats } from '../lib/storyBeats';
import { findStorySessionByCode } from '../lib/storySession';
import StoryBeatView from '../components/StoryBeatView';
import SceneSelectMenu from '../components/SceneSelectMenu';
import type { Adventure } from '../types/adventure';
import type { StorySession } from '../types/story';

export default function StoryPlayerPage() {
  const navigate = useNavigate();

  // Join state
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Session state
  const [session, setSession] = useState<StorySession | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [dmBeatIndex, setDmBeatIndex] = useState(0); // DM's position (synced)
  const [localBeatIndex, setLocalBeatIndex] = useState(0); // Player's viewed position
  const [showOutcome, setShowOutcome] = useState(false);
  const [showSceneMenu, setShowSceneMenu] = useState(false);

  // Convert adventure to beats
  const beats = useMemo(
    () => (adventure ? adventureToBeats(adventure) : []),
    [adventure]
  );

  const currentBeat = beats[localBeatIndex];
  const isFirstBeat = localBeatIndex === 0;
  const isLastBeat = localBeatIndex === beats.length - 1;
  const isSceneBeat = currentBeat?.type === 'scene';
  const isLive = localBeatIndex === dmBeatIndex;

  // Join session handler
  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setJoinError('Please enter a room code');
      return;
    }

    setJoining(true);
    setJoinError(null);

    const { data, error } = await findStorySessionByCode(roomCode.trim());

    if (error || !data) {
      setJoinError(error || 'Room not found');
      setJoining(false);
      return;
    }

    // Load adventure
    const adv = await loadAdventure(data.adventure_id);
    if (!adv) {
      setJoinError('Adventure not found');
      setJoining(false);
      return;
    }

    setSession(data);
    setAdventure(adv);
    setDmBeatIndex(data.current_beat_index);
    setLocalBeatIndex(data.current_beat_index);
    setJoining(false);
  };

  // Subscribe to session updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`story:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'story_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const newIndex = (payload.new as StorySession).current_beat_index;
          setDmBeatIndex(newIndex);

          // Auto-follow if player is currently live
          setLocalBeatIndex(prev => {
            // If player was at DM's position, follow along
            if (prev === dmBeatIndex) {
              return newIndex;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, dmBeatIndex]);

  // Navigation handlers
  const goNext = useCallback(() => {
    if (isSceneBeat && !showOutcome && currentBeat?.outcomeText) {
      setShowOutcome(true);
      return;
    }

    if (!isLastBeat) {
      setLocalBeatIndex(prev => prev + 1);
      setShowOutcome(false);
    }
  }, [isLastBeat, isSceneBeat, showOutcome, currentBeat]);

  const goBack = useCallback(() => {
    if (showOutcome) {
      setShowOutcome(false);
      return;
    }

    if (!isFirstBeat) {
      setLocalBeatIndex(prev => prev - 1);
      setShowOutcome(false);
    }
  }, [isFirstBeat, showOutcome]);

  const jumpToBeat = useCallback((index: number) => {
    setLocalBeatIndex(index);
    setShowOutcome(false);
    setShowSceneMenu(false);
  }, []);

  const returnToLive = useCallback(() => {
    setLocalBeatIndex(dmBeatIndex);
    setShowOutcome(false);
  }, [dmBeatIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!session) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSceneMenu) return;

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
  }, [session, goNext, goBack, showSceneMenu]);

  // Join screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Join Story</h1>
            <p className="text-gray-600 mt-1">Enter the room code from the storyteller</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Joining...
                </span>
              ) : (
                'Join Story'
              )}
            </button>

            {joinError && (
              <p className="text-red-600 text-sm text-center">{joinError}</p>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Story viewer
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header with sync indicator */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <button
          onClick={() => setShowSceneMenu(true)}
          className="px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          Scenes
        </button>

        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">
              <Radio className="w-3 h-3" />
              Live
            </span>
          ) : (
            <button
              onClick={returnToLive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-medium hover:bg-red-500 transition-colors"
            >
              <Radio className="w-3 h-3" />
              Return to Live
            </button>
          )}
        </div>

        <p className="text-sm text-gray-300">
          {localBeatIndex + 1} / {beats.length}
        </p>
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

        <p className="text-gray-400 text-sm">
          {isLive ? 'Following storyteller' : 'Browsing'}
        </p>

        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={isLastBeat && (!isSceneBeat || showOutcome || !currentBeat?.outcomeText)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>

      {/* Scene select menu */}
      {showSceneMenu && (
        <SceneSelectMenu
          beats={beats}
          currentBeatIndex={localBeatIndex}
          onSelectBeat={jumpToBeat}
          onClose={() => setShowSceneMenu(false)}
        />
      )}
    </div>
  );
}
