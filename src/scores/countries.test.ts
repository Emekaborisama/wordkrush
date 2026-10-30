import { describe, expect, it } from 'vitest';
import { NO_COUNTRIES, parsePlayerCountries } from './countries';

describe('parsePlayerCountries', () => {
  it('reads each player with a known country', () => {
    const countries = parsePlayerCountries([
      { id: 'a', country_code: 'NG' },
      { id: 'b', country_code: 'gb' },
    ]);
    expect(countries.get('a')).toBe('NG');
    expect(countries.get('b')).toBe('GB');
  });

  it('leaves out players with no flag', () => {
    expect(parsePlayerCountries([{ id: 'a', country_code: null }]).size).toBe(0);
  });

  it('drops anything that is not a real country or a real row', () => {
    const countries = parsePlayerCountries([{ id: 'a', country_code: 'ZZ' }, { id: 7, country_code: 'NG' }, null, 'NG']);
    expect(countries.size).toBe(0);
  });

  it('treats a failed or malformed response as no flags', () => {
    expect(parsePlayerCountries(null)).toBe(NO_COUNTRIES);
    expect(parsePlayerCountries({ id: 'a' })).toBe(NO_COUNTRIES);
  });
});
