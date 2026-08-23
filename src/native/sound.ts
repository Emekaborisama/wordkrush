/**
 * Sound effects.
 *
 * Unlike haptics, this has no platform twin: `expo-audio` plays on iOS,
 * Android and web from the same code, and the clips are bundled assets rather
 * than a CDN fetch, so playback does not depend on the network (STACK D-043).
 *
 * Two rules shape everything here:
 *
 * 1. **Never interrupt a run.** Every entry point is wrapped. A missing codec,
 *    a browser that has not seen a user gesture yet, a device mid-call — all of
 *    those resolve to silence, never to a thrown error. Same principle as
 *    `haptics.native.ts`: the feedback is a nicety, the game is the point.
 * 2. **Never surprise the player.** The audio mode is set so the iOS silent
 *    switch still silences the game and other apps' music keeps playing.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundName = 'bonus' | 'wrong' | 'nextLevel' | 'win';

/**
 * `require` rather than `import` so Metro bundles each clip as an asset. Kept
 * as one map so adding a clip is a single line here plus a `SoundName` member.
 */
const SOURCES: Record<SoundName, number> = {
  bonus: require('../../assets/sounds/bonus.mp3'),
  wrong: require('../../assets/sounds/wrong.mp3'),
  nextLevel: require('../../assets/sounds/next_level.mp3'),
  win: require('../../assets/sounds/achievement_win.mp3'),
};

/**
 * Per-clip trim, because the four files were not mastered to a common
 * loudness. `wrong` fires far more often than the others and is the one most
 * likely to grate, so it sits lowest.
 */
const VOLUME: Record<SoundName, number> = {
  bonus: 0.8,
  wrong: 0.55,
  nextLevel: 0.75,
  win: 0.85,
};

const players = new Map<SoundName, AudioPlayer>();
/** Clips that have been played at least once, so we know a rewind is meaningful. */
const started = new Set<SoundName>();
let audioModeReady = false;

/**
 * Applied once, lazily, on the first play.
 *
 * `playsInSilentMode: false` is deliberate: a phone switched to silent should
 * stay silent. `mixWithOthers` means we duck nothing — someone playing on the
 * bus with their own music on keeps their music.
 */
async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch {
    /* older device or unsupported browser — defaults are close enough */
  }
}

/**
 * Players are created on first use and then kept, so the common case is a
 * seek-and-play with no decode. Creating them at module scope instead would
 * fire on import — before the first user gesture, which browsers reject.
 */
function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOURCES[name]);
    player.volume = VOLUME[name];
    players.set(name, player);
    return player;
  } catch {
    return null;
  }
}

/**
 * Plays a clip from the start, cutting off its own previous play if it is
 * still running. Restarting is right for game feedback: three quick correct
 * answers should sound like three hits, not one smeared chord.
 *
 * Fire-and-forget — callers use `void play('wrong')` and never await.
 */
export async function play(name: SoundName): Promise<void> {
  try {
    await ensureAudioMode();
    const player = playerFor(name);
    if (!player) return;
    // Rewind so a re-trigger restarts rather than resuming from the end of the
    // last play, where it would be inaudible. Skipped on the very first play:
    // the clip is still loading then, and seeking an unloaded player rejects.
    // Guarded separately so a failed seek still leaves us playing something —
    // folding it into the outer try would turn a bad rewind into silence.
    if (started.has(name)) {
      try {
        await player.seekTo(0);
      } catch {
        /* not seekable yet — play from wherever it is */
      }
    }
    started.add(name);
    player.play();
  } catch {
    /* unsupported, interrupted, or not yet unlocked by a gesture */
  }
}

/**
 * Releases the native players. Called when sound is switched off so a muted
 * game holds no decoded audio; the next play after re-enabling rebuilds them.
 */
export function unloadAll(): void {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      /* already gone */
    }
  }
  players.clear();
  started.clear();
}
