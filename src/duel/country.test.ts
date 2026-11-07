import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, countryFromLocale, flagEmoji, normalizeCountry } from './country';

describe('normalizeCountry', () => {
  it('accepts real codes in any case and rejects the rest', () => {
    expect(normalizeCountry('ng')).toBe('NG');
    expect(normalizeCountry(' GB ')).toBe('GB');
    expect(normalizeCountry('XX')).toBeNull();
    expect(normalizeCountry('T1')).toBeNull();
    expect(normalizeCountry(7)).toBeNull();
    expect(normalizeCountry(undefined)).toBeNull();
  });
});

describe('flagEmoji', () => {
  it('builds the flag from the two letters', () => {
    expect(flagEmoji('NG')).toBe('🇳🇬');
    expect(flagEmoji('gb')).toBe('🇬🇧');
  });
});

describe('countryFromLocale', () => {
  it('reads the region from a locale', () => {
    expect(countryFromLocale('en-NG')).toBe('NG');
    expect(countryFromLocale('zh-Hant-TW')).toBe('TW');
    expect(countryFromLocale('en')).toBeNull();
  });
});

describe('COUNTRY_CODES', () => {
  it('lists unique two-letter codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    expect(COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    expect(COUNTRY_CODES.length).toBeGreaterThan(240);
  });
});
