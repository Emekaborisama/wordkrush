import { describe, expect, it } from 'vitest';
import { isAuthCallbackUrl, parseAuthCallbackUrl } from './callback';

describe('parseAuthCallbackUrl', () => {
  it('reads a PKCE code from the query string', () => {
    expect(
      parseAuthCallbackUrl('wordkrush://auth/callback?code=abc123'),
    ).toEqual({
      code: 'abc123',
      accessToken: null,
      refreshToken: null,
    });
  });

  it('reads implicit tokens from the hash', () => {
    expect(
      parseAuthCallbackUrl(
        'https://wordkrush.com/#access_token=aaa&refresh_token=bbb&type=magiclink',
      ),
    ).toEqual({
      code: null,
      accessToken: 'aaa',
      refreshToken: 'bbb',
    });
  });

  it('ignores a trailing hash when the code is in the query', () => {
    expect(
      parseAuthCallbackUrl(
        'exp://192.168.1.8:8081/--/auth/callback?code=pkce#ignored=1',
      ).code,
    ).toBe('pkce');
  });

  it('returns empty params for unrelated URLs', () => {
    expect(parseAuthCallbackUrl('wordkrush://scores')).toEqual({
      code: null,
      accessToken: null,
      refreshToken: null,
    });
    expect(isAuthCallbackUrl('https://wordkrush.com/')).toBe(false);
    expect(isAuthCallbackUrl('wordkrush://auth/callback?code=x')).toBe(true);
  });
});
