/**
 * Background music: one looping track for Home and menus and one for a game,
 * both original Afrobeats instrumentals (`assets/music/`).
 *
 * Same two rules as `sound.ts`. It **never interrupts a run**: every entry
 * point is wrapped and a failure is silence. It **never surprises the
 * player**: the iOS silent switch still silences it (the shared audio mode),
 * it pauses when the app or tab goes to the background, and Settings has a
 * Music switch of its own, separate from sound effects.
 *
 * On web a browser will not start audio before the player has touched the
 * page, so the first pointer or key press unlocks it inside that gesture.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { AppState, Platform } from 'react-native';
import { ensureAudioMode } from './sound';

export type MusicTrack = 'menu' | 'play';

const SOURCES: Record<MusicTrack, number> = {
  menu: require('../../assets/music/danfo-groove-menu.m4a'),
  play: require('../../assets/music/danfo-groove-play.m4a'),
};

/** Under the sound effects, so a right answer still pops out of the groove. */
const VOLUME = 0.32;

const players = new Map<MusicTrack, AudioPlayer>();
let enabled = true;
let wanted: MusicTrack | null = null;
let background = false;
let unlocked = Platform.OS !== 'web';
let watching = false;

function playerFor(track: MusicTrack): AudioPlayer | null {
  const existing = players.get(track);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOURCES[track]);
    player.loop = true;
    player.volume = VOLUME;
    players.set(track, player);
    return player;
  } catch {
    return null;
  }
}

/** Brings the players in line with what is wanted. Synchronous, so it can run inside a gesture. */
function sync(): void {
  const target = enabled && unlocked && !background ? wanted : null;
  for (const [track, player] of players) {
    if (track === target) continue;
    try {
      if (player.playing) player.pause();
    } catch {
      /* already gone */
    }
  }
  if (!target) return;
  const player = playerFor(target);
  if (!player) return;
  try {
    if (!player.playing) player.play();
  } catch {
    /* not yet allowed by the browser, or interrupted */
  }
}

function unlockOnGesture(): void {
  unlocked = true;
  sync();
}

/** Starts the listeners once: background pause, and the web gesture unlock. */
function watch(): void {
  if (watching) return;
  watching = true;
  AppState.addEventListener('change', (state) => {
    background = state !== 'active';
    sync();
  });
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('pointerdown', unlockOnGesture, { capture: true, once: true });
    document.addEventListener('keydown', unlockOnGesture, { capture: true, once: true });
  }
}

/** Which track should be playing; `null` for quiet. Called as the screen changes. */
export function setMusicTrack(track: MusicTrack | null): void {
  watch();
  wanted = track;
  void ensureAudioMode();
  sync();
}

/**
 * Mirrors the Settings switch. Switching off releases the players so a quiet
 * game holds no decoded audio; switching on picks the wanted track back up.
 */
export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (!on) {
    for (const player of players.values()) {
      try {
        player.remove();
      } catch {
        /* already released */
      }
    }
    players.clear();
    return;
  }
  sync();
}
