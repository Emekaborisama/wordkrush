import { describe, expect, it } from 'vitest';
import { validateUsername } from '../auth/validation';
import { duelPlayerFrom, guestName, newIdentity, parseIdentity, withDetectedCountry } from './identity';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('guest names', () => {
  it('always pass the username rules, so the other side accepts them', () => {
    for (let i = 0; i < 200; i += 1) expect(validateUsername(guestName(Math.random))).toBeNull();
  });
});

describe('identity', () => {
  it('round-trips through storage', () => {
    const identity = { ...newIdentity(seq([0.1, 0.5, 0.9])), country: 'NG', countryChosen: true };
    expect(parseIdentity(JSON.stringify(identity))).toEqual(identity);
  });

  it('throws away anything malformed', () => {
    expect(parseIdentity(null)).toBeNull();
    expect(parseIdentity('nope')).toBeNull();
    expect(parseIdentity('{"id":"x"}')).toBeNull();
  });

  it('drops a bad stored country but keeps the player', () => {
    const identity = newIdentity(seq([0.3]));
    expect(parseIdentity(JSON.stringify({ ...identity, country: 'ZZ' }))?.country).toBeNull();
  });
});

describe('duelPlayerFrom', () => {
  const identity = { id: 'abc12345', guestName: 'Swift Panda', country: 'NG', countryChosen: false, flagHidden: false };

  it('uses the username when signed in and the guest name otherwise', () => {
    expect(duelPlayerFrom(identity, 'Emeka').name).toBe('Emeka');
    expect(duelPlayerFrom(identity, null).name).toBe('Swift Panda');
  });

  it('sends no country when the flag is hidden', () => {
    expect(duelPlayerFrom({ ...identity, flagHidden: true }, null).country).toBeNull();
  });
});

describe('withDetectedCountry', () => {
  const detected = { ...newIdentity(() => 0.5), country: 'AF' };

  it('replaces an old reading, so a flag from a VPN corrects itself', () => {
    expect(withDetectedCountry(detected, 'GB').country).toBe('GB');
  });

  it('never touches a flag the player picked', () => {
    const picked = { ...detected, countryChosen: true };
    expect(withDetectedCountry(picked, 'GB')).toBe(picked);
  });

  it('keeps what it has when there is no reading, or the same one', () => {
    expect(withDetectedCountry(detected, null)).toBe(detected);
    expect(withDetectedCountry(detected, 'AF')).toBe(detected);
  });
});
