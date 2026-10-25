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
  menu: require('../../assets/music/danfo-groove-menu.mp4'),
  play: require('../../assets/music/danfo-groove-play.mp4'),
};

// The files carry their own level (about -10 dB, under the sound effects):
// iOS Safari ignores programmatic volume, so a player-side 0.32 did nothing
// there. Nothing here sets `volume`.

const players = new Map<MusicTrack, AudioPlayer>();
// Off until the saved Settings arrive (`setMusicEnabled`), so a player who
// switched music off never hears a bar of it on launch.
let enabled = false;
let wanted: MusicTrack | null = null;
let background = false;
let unlocked = Platform.OS !== 'web';
// Native waits for the mixing audio mode before the first play; otherwise iOS
// starts the session in its default mode and stops the player's own music.
let modeReady = Platform.OS === 'web';
let watching = false;

function playerFor(track: MusicTrack): AudioPlayer | null {
  const existing = players.get(track);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOURCES[track]);
    player.loop = true;
    players.set(track, player);
    return player;
  } catch {
    return null;
  }
}

/**
 * Brings the players in line with what is wanted. Synchronous, so it can run
 * inside a gesture. Reads `paused` rather than `playing`: on web, expo-audio
 * marks a player playing even when the browser refused, which stopped retries.
 */
function sync(): void {
  if (!modeReady) {
    void ensureAudioMode().then(() => {
      modeReady = true;
      sync();
    });
    return;
  }
  const target = enabled && unlocked && !background ? wanted : null;
  for (const [track, player] of players) {
    if (track === target) continue;
    try {
      if (!player.paused) player.pause();
    } catch {
      /* already gone */
    }
  }
  if (!target) return;
  const player = playerFor(target);
  if (!player) return;
  try {
    if (player.paused) player.play();
  } catch {
    /* not yet allowed by the browser, or interrupted */
  }
}

/**
 * A browser lets a page start audio only inside a real activation: a key, a
 * click, a touch ending or a pointer lifting (a touch `pointerdown` does not
 * count). Every one re-syncs, which is a no-op once music is playing, so a
 * refused first attempt is retried on the next tap.
 */
function onGesture(): void {
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
    for (const type of ['click', 'pointerup', 'touchend', 'keydown']) {
      document.addEventListener(type, onGesture, { capture: true });
    }
  }
}

/** Which track should be playing; `null` for quiet. Called as the screen changes. */
export function setMusicTrack(track: MusicTrack | null): void {
  watch();
  wanted = track;
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
