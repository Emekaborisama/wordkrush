/**
 * Where the browser Back button goes.
 *
 * Screens stay in React state. This map is the only parent relationship, so
 * the header back and the history adapter cannot drift apart.
 */

export type Navigable =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'lagos' }
  | { name: 'duel' }
  | { name: 'game'; gameId: string; live?: unknown; molLevel?: { path: 'world' | 'lagos' } }
  | { name: 'over'; gameId: string; molLevel?: { path: 'world' | 'lagos' } }
  | { name: 'scores' }
  | { name: 'auth'; returnTo?: 'teams' | 'scores'; returnGameId?: string }
  | { name: 'teams' }
  | { name: 'live-lobby' }
  | { name: 'live-results' };

export type Parent =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'lagos' }
  | { name: 'teams' };

/** Parent screen, or null when this screen is the root and Back may leave. */
export function parentOf(screen: Navigable): Parent | null {
  switch (screen.name) {
    case 'hub':
      return null;
    case 'home':
    case 'lagos':
    case 'duel':
    case 'scores':
    case 'teams':
      return { name: 'hub' };
    case 'over':
      // A finished I Sabi Lagos run goes back to the route, not the hub.
      return screen.molLevel?.path === 'lagos' ? { name: 'lagos' } : { name: 'hub' };
    case 'game':
      if (screen.live) return { name: 'teams' };
      if (screen.molLevel?.path === 'lagos') return { name: 'lagos' };
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
