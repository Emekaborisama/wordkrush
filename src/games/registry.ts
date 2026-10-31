/**
 * The game registry — the single list the hub renders from.
 *
 * Adding a game means adding an entry here and a screen; the hub, score
 * namespacing and routing all follow automatically. Nothing about the hub
 * hard-codes a specific game.
 */

export type GameStatus = 'available' | 'coming-soon';

export type GameDefinition = {
  /** Stable id. Namespaces stored scores, so NEVER change it after release. */
  id: string;
  name: string;
  /** One line, shown under the name on the hub card. */
  tagline: string;
  /** Card accent, so games are distinguishable at a glance. */
  accent: string;
  /** Placeholder art until real key art exists. */
  emoji: string;
  status: GameStatus;
  /** What a score means in this game, e.g. "streak". Used in score UI copy. */
  scoreNoun: string;
  /** Short pill on the start screen, e.g. "QUICK THINKING". */
  badge: string;
  /**
   * Second-person description for the start screen. Longer than `tagline`,
   * which has to fit one line on a hub card.
   */
  blurb: string;
  /**
   * Which way is better. WordKrush scores a streak (higher wins); Clueless
   * scores guesses used (lower wins). Score UI and leaderboard sorting must
   * read this rather than assuming, or one game's board is upside down.
   */
  scoreDirection: 'higher' | 'lower';
};

export const GAMES: GameDefinition[] = [
  {
    id: 'more-or-less',
    // Player-facing name since 0.12.0 ("More or Less" read as vague); the id stays.
    name: 'Higher or Lower',
    tagline: 'Trust your gut. Build a streak.',
    badge: 'QUICK THINKING',
    blurb:
      'One number is shown. Guess if the next one is higher or lower. Every right call keeps your streak alive.',
    accent: '#32E487',
    emoji: '⚖️',
    status: 'available',
    scoreNoun: 'streak',
    scoreDirection: 'higher',
  },
  {
    id: 'clueless',
    name: 'Clueless',
    tagline: 'Find the secret word by meaning.',
    badge: 'SOLO PATH',
    blurb:
      'Every guess is ranked by meaning, not spelling. Clear the sparks, then open the vault.',
    accent: '#9B78FF',
    emoji: '❓',
    status: 'available',
    scoreNoun: 'guesses',
    scoreDirection: 'lower',
  },
  {
    id: 'wordfall',
    name: 'Wordfall',
    tagline: 'Trace words. Set off cascades.',
    badge: 'WEEKLY LEVELS',
    blurb:
      'Trace words across the grid to clear tiles and set off cascades. A new level drops every Monday.',
    accent: '#FFB020',
    emoji: '🔡',
    status: 'available',
    // A run is one level, so the board records the best single-level score.
    scoreNoun: 'points',
    scoreDirection: 'higher',
  },
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}

export const playableGames = () => GAMES.filter((g) => g.status === 'available');
