/**
 * The level-by-level labels for More or Less, and the I Sabi Lagos route.
 *
 * Every label is measured the same way as Popularity — median monthly
 * Wikipedia pageviews, built by `CATEGORY=<id> npm run pipeline:preview` from
 * `pipeline/keywords/<id>.json` — so a pair is always a fair comparison and
 * the numbers are measured, never guessed (D-012). Targets climb slowly; the
 * pairing curve already gets tighter as a streak grows.
 */
import type { LabelLevel, LabelPathId } from '../../games/more-or-less/labelPath';

export const WORLD_PATH: readonly LabelLevel[] = [
  {
    number: 1,
    categoryId: 'wikipedia-popularity',
    name: 'Popularity',
    description: 'People, places and things everyone has heard of.',
    targetStreak: 5,
  },
  {
    number: 2,
    categoryId: 'wikipedia-music-stars',
    name: 'Music stars',
    description: 'Which star gets looked up more?',
    targetStreak: 5,
  },
  {
    number: 3,
    categoryId: 'wikipedia-movies',
    name: 'Movies',
    description: 'Blockbusters and classics, head to head.',
    targetStreak: 6,
  },
  {
    number: 4,
    categoryId: 'wikipedia-football-stars',
    name: 'Football stars',
    description: 'Legends against today’s stars.',
    targetStreak: 6,
  },
  {
    number: 5,
    categoryId: 'wikipedia-world-cities',
    name: 'World cities',
    description: 'From Lagos to Tokyo — which city gets read more?',
    targetStreak: 7,
  },
  {
    number: 6,
    categoryId: 'wikipedia-food',
    name: 'Food',
    description: 'Jollof against pizza, and everything between.',
    targetStreak: 7,
  },
  {
    number: 7,
    categoryId: 'wikipedia-hit-songs',
    name: 'Hit songs',
    description: 'The playlist round: which song gets read more?',
    targetStreak: 8,
  },
];

/** The danfo route: each level is a stop between Ojuelegba and Oshodi. */
export const LAGOS_PATH: readonly LabelLevel[] = [
  {
    number: 1,
    categoryId: 'lagos-places',
    name: 'Lagos places',
    description: 'Lekki or Ikeja? Yaba or Surulere?',
    targetStreak: 5,
    stop: 'Ojuelegba',
  },
  {
    number: 2,
    categoryId: 'lagos-food',
    name: 'Naija food',
    description: 'Jollof, suya, amala — which one people dey find?',
    targetStreak: 5,
    stop: 'Yaba',
  },
  {
    number: 3,
    categoryId: 'lagos-afrobeats-stars',
    name: 'Afrobeats stars',
    description: 'Burna, Wiz, Davido, Tems… who dey hot pass?',
    targetStreak: 6,
    stop: 'Obalende',
  },
  {
    number: 4,
    categoryId: 'lagos-nollywood',
    name: 'Nollywood',
    description: 'Stars, films and the shows wey everybody watch.',
    targetStreak: 6,
    stop: 'CMS',
  },
  {
    number: 5,
    categoryId: 'lagos-afrobeats-hits',
    name: 'Afrobeats hits',
    description: 'The playlist stop: which jam people look up more?',
    targetStreak: 7,
    stop: 'Lekki',
  },
  {
    number: 6,
    categoryId: 'lagos-football',
    name: 'Naija football',
    description: 'Super Eagles, Super Falcons and the legends.',
    targetStreak: 7,
    stop: 'Ikeja',
  },
  {
    number: 7,
    categoryId: 'lagos-moments',
    name: 'Lagos stories',
    description: 'The wild things wey happen for Lagos — which one people still dey read?',
    targetStreak: 8,
    stop: 'Oshodi',
  },
];

export function labelPath(path: LabelPathId): readonly LabelLevel[] {
  return path === 'lagos' ? LAGOS_PATH : WORLD_PATH;
}

export function labelLevel(path: LabelPathId, levelNumber: number): LabelLevel | undefined {
  return labelPath(path)[levelNumber - 1];
}
