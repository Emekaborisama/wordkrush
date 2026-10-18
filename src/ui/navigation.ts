/**
 * Where the browser Back button goes.
 *
 * Screens stay in React state. This map is the only parent relationship, so
 * the header back and the history adapter cannot drift apart.
 */

export type Navigable =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'game'; gameId: string; live?: unknown }
  | { name: 'over'; gameId: string }
  | { name: 'scores' }
  | { name: 'auth'; returnTo?: 'teams' | 'scores'; returnGameId?: string }
  | { name: 'teams' }
  | { name: 'live-lobby' }
  | { name: 'live-results' };

export type Parent =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'teams' };

/** Parent screen, or null when this screen is the root and Back may leave. */
export function parentOf(screen: Navigable): Parent | null {
  switch (screen.name) {
    case 'hub':
      return null;
    case 'home':
    case 'scores':
    case 'teams':
    case 'over':
      return { name: 'hub' };
    case 'game':
      if (screen.live) return { name: 'teams' };
      return { name: 'home', gameId: screen.gameId };
    case 'auth':
      if (screen.returnTo === 'teams') {
        return { name: 'home', gameId: screen.returnGameId ?? 'wordfall' };
      }
      return { name: 'hub' };
    case 'live-lobby':
    case 'live-results':
      return { name: 'teams' };
  }
}
