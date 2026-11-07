/**
 * The level-by-level labels for More or Less, and the I Sabi Lagos route.
 *
 * Every label is one measured metric shared by all its items, so a pair is
 * always a fair comparison and the numbers are measured, never guessed:
 *
 *  - levels 1–7 and Lagos stops 1–7 are median monthly Wikipedia pageviews,
 *    built by `CATEGORY=<id> npm run pipeline:preview` from
 *    `pipeline/keywords/<id>.json` (D-012);
 *  - the levels after them are facts from Wikidata (population, height,
 *    length, area), built by `npm run pipeline:wikidata` from
 *    `pipeline/entities/<id>.json` (D-075).
 *
 * New levels are only ever APPENDED: a player's progress is stored by level
 * number, so inserting one would shift every level after it.
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
  // From here on, the numbers are facts from Wikidata rather than pageviews.
  {
    number: 8,
    categoryId: 'countries-population',
    name: 'Population',
    description: 'Which country has more people?',
    targetStreak: 6,
  },
  {
    number: 9,
    categoryId: 'landmarks-height',
    name: 'Tall landmarks',
    description: 'Skyscrapers, towers and temples: which stands taller?',
    targetStreak: 6,
  },
  {
    number: 10,
    categoryId: 'mountains-height',
    name: 'Mountains',
    description: 'From Arthur’s Seat to Everest: which peak climbs higher?',
    targetStreak: 7,
  },
  {
    number: 11,
    categoryId: 'rivers-length',
    name: 'Rivers',
    description: 'From the Liffey to the Nile: which river runs longer?',
    targetStreak: 7,
  },
  {
    number: 12,
    categoryId: 'countries-area',
    name: 'Country size',
    description: 'Which country covers more ground?',
    targetStreak: 8,
  },
  {
    number: 13,
    categoryId: 'islands-area',
    name: 'Islands',
    description: 'From Alcatraz to Greenland: which island is bigger?',
    targetStreak: 8,
  },
];

/** The danfo route: each level is a stop, from Ojuelegba onward. */
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
  {
    number: 8,
    categoryId: 'lagos-states-area',
    name: 'Naija states',
    description: 'Kano or Kaduna? Which state get more land?',
    targetStreak: 7,
    stop: 'Ojota',
  },
];

export function labelPath(path: LabelPathId): readonly LabelLevel[] {
  return path === 'lagos' ? LAGOS_PATH : WORLD_PATH;
}

export function labelLevel(path: LabelPathId, levelNumber: number): LabelLevel | undefined {
  return labelPath(path)[levelNumber - 1];
}
