import { describe, expect, it } from 'vitest';
import { webAuthRedirectUrl } from './redirect-url';

describe('webAuthRedirectUrl', () => {
  it('keeps an origin that already has a scheme', () => {
    expect(webAuthRedirectUrl('https://wordkrush.com')).toBe('https://wordkrush.com');
    expect(webAuthRedirectUrl('http://localhost:8081/')).toBe('http://localhost:8081');
  });

  it('prefixes https when the host has no scheme', () => {
    expect(webAuthRedirectUrl('wordkrush.com')).toBe('https://wordkrush.com');
  });
});
