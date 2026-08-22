/**
 * Bundled Wordfall data.
 *
 * The dictionary ships with the app, so the game works with no network — the
 * same offline guarantee as the other two titles (docs/STACK.md D-004).
 *
 * Regenerate the dictionary with:
 *   npm run pipeline:wordfall
 */
import { createDictionary, type DictionaryData } from '../../games/wordfall/dictionary';
import dictionaryData from './dictionary.json';

/**
 * Built once at module load. Cheap by design: the word list is binary-searched
 * in place rather than hydrated into a Set, so this only builds the ~6k-entry
 * rarity ranking. Hydrating all 76k words here would cost a visible pause on
 * app launch for a game the player may not even open.
 */
export const DICTIONARY = createDictionary(dictionaryData as DictionaryData);

export { LAST_LEVEL, LEVELS, levelByNumber } from './levels';
