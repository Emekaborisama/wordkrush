/**
 * Every bundled More or Less label, by category id. Built offline by the
 * Wikipedia pipeline (`CATEGORY=<id> npm run pipeline:preview`) and shipped in
 * the app, so a level plays with no network (D-004).
 */
import type { CategorySnapshot } from '../../games/more-or-less/rounds';
import lagosAfrobeatsHits from '../categories/lagos-afrobeats-hits.json';
import lagosAfrobeatsStars from '../categories/lagos-afrobeats-stars.json';
import lagosFood from '../categories/lagos-food.json';
import lagosFootball from '../categories/lagos-football.json';
import lagosMoments from '../categories/lagos-moments.json';
import lagosNollywood from '../categories/lagos-nollywood.json';
import lagosPlaces from '../categories/lagos-places.json';
import food from '../categories/wikipedia-food.json';
import footballStars from '../categories/wikipedia-football-stars.json';
import hitSongs from '../categories/wikipedia-hit-songs.json';
import movies from '../categories/wikipedia-movies.json';
import musicStars from '../categories/wikipedia-music-stars.json';
import popularity from '../categories/wikipedia-popularity.json';
import worldCities from '../categories/wikipedia-world-cities.json';

const ALL: readonly CategorySnapshot[] = [
  popularity,
  musicStars,
  movies,
  footballStars,
  worldCities,
  food,
  hitSongs,
  lagosPlaces,
  lagosFood,
  lagosAfrobeatsStars,
  lagosNollywood,
  lagosAfrobeatsHits,
  lagosFootball,
  lagosMoments,
] as CategorySnapshot[];

const BY_ID = new Map(ALL.map((category) => [category.id, category]));

export function labelCategory(id: string): CategorySnapshot | undefined {
  return BY_ID.get(id);
}
