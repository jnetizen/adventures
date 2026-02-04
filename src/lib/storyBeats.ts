import type { Adventure } from '../types/adventure';
import type { StoryBeat } from '../types/story';

/**
 * Convert an adventure into a linear array of story beats.
 * Simplified flow: prologue → scenes (narration only) → legendary ending
 */
export function adventureToBeats(adventure: Adventure): StoryBeat[] {
  const beats: StoryBeat[] = [];

  // --- Prologue beats ---
  if (adventure.prologue) {
    // World intro
    if (adventure.prologue.worldIntro) {
      beats.push({
        type: 'prologue-world',
        image: adventure.prologue.prologueImageUrl,
        text: adventure.prologue.worldIntro,
      });
    }

    // Character intros (all on one page)
    if (adventure.prologue.characterIntros && adventure.prologue.characterIntros.length > 0) {
      beats.push({
        type: 'prologue-characters',
        characters: adventure.prologue.characterIntros.map(intro => {
          const character = adventure.characters.find(c => c.id === intro.characterId);
          return {
            characterId: intro.characterId,
            characterName: character?.name ?? intro.characterId,
            text: intro.introText,
            image: character?.imageUrl,
          };
        }),
      });
    }

    // Mission brief
    if (adventure.prologue.missionBrief) {
      beats.push({
        type: 'prologue-mission',
        text: adventure.prologue.missionBrief,
      });
    }
  }

  // --- Scene beats ---
  const sceneCount = adventure.scenes.length;
  for (let i = 0; i < sceneCount; i++) {
    const scene = adventure.scenes[i];
    beats.push({
      type: 'scene',
      sceneId: scene.id,
      sceneIndex: i,
      sceneCount,
      image: scene.sceneImageUrl,
      narration: scene.narrationText,
      outcomeText: scene.outcome?.resultText,
    });
  }

  // --- Ending beat ---
  // Always use legendary ending (first threshold / best ending)
  const ending = getLegendaryEnding(adventure);
  if (ending) {
    beats.push({
      type: 'ending',
      title: ending.title,
      text: ending.narrationText,
      image: undefined, // Tiered endings don't have images
      rewards: ending.rewards ?? [],
    });
  } else if (adventure.ending) {
    // Fallback to single ending format (race-to-rainbow-reef style)
    beats.push({
      type: 'ending',
      title: adventure.ending.title,
      text: adventure.ending.narrationText,
      image: adventure.ending.endingImageUrl,
      rewards: [],
    });
  }

  return beats;
}

/**
 * Get the legendary (best) ending from an adventure.
 * Looks for 'ending-legendary' or falls back to first ending.
 */
function getLegendaryEnding(adventure: Adventure) {
  if (!adventure.endings || adventure.endings.length === 0) {
    return null;
  }

  // Try to find legendary tier
  const legendary = adventure.endings.find(e =>
    e.id === 'ending-legendary' || e.tier === 'legendary'
  );
  if (legendary) return legendary;

  // Fallback to first ending (usually best)
  return adventure.endings[0];
}

/**
 * Get scene index for a given beat index.
 * Returns -1 for prologue/ending beats.
 */
export function getBeatSceneIndex(beats: StoryBeat[], beatIndex: number): number {
  const beat = beats[beatIndex];
  if (!beat || beat.type !== 'scene') return -1;
  return beat.sceneIndex;
}

/**
 * Find the beat index where a specific scene starts.
 */
export function findSceneBeatIndex(beats: StoryBeat[], sceneIndex: number): number {
  return beats.findIndex(
    beat => beat.type === 'scene' && beat.sceneIndex === sceneIndex
  );
}

/**
 * Get info about story structure for scene select menu.
 */
export function getStoryStructure(beats: StoryBeat[]) {
  const prologueBeats = beats.filter(b => b.type.startsWith('prologue-'));
  const sceneBeats = beats.filter(b => b.type === 'scene') as Extract<StoryBeat, { type: 'scene' }>[];
  const hasEnding = beats.some(b => b.type === 'ending');

  return {
    prologueStartIndex: prologueBeats.length > 0 ? 0 : -1,
    prologueBeatCount: prologueBeats.length,
    scenes: sceneBeats.map(scene => ({
      sceneIndex: scene.sceneIndex,
      beatIndex: beats.indexOf(scene),
      image: scene.image,
    })),
    endingBeatIndex: hasEnding ? beats.length - 1 : -1,
    totalBeats: beats.length,
  };
}
