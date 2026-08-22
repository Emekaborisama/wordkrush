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
    name: 'More or Less',
    tagline: 'Which one is bigger? Trust your instinct and build a streak.',
    accent: '#32E487',
    emoji: '⚖️',
    status: 'available',
    scoreNoun: 'streak',
    scoreDirection: 'higher',
  },
  {
    id: 'clueless',
    name: 'Clueless',
    tagline: 'Follow the meaning trail to uncover today’s secret word.',
    accent: '#9B78FF',
    emoji: '❓',
    status: 'available',
    scoreNoun: 'guesses',
    scoreDirection: 'lower',
  },
  {
    id: 'wordfall',
    name: 'Wordfall',
    tagline: 'New levels every Monday. Trace words and set off cascades.',
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
