import { describe, expect, it } from 'vitest';
import { isInviteCode, normalizeInviteCode, parseTeamInviteUrl, teamInviteUrl } from './codes';

describe('invite codes', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeInviteCode(' ab12cd ')).toBe('AB12CD');
    expect(isInviteCode('AB12CD')).toBe(true);
    expect(isInviteCode('AB1OCD')).toBe(false);
    expect(isInviteCode('SHORT')).toBe(false);
  });

  it('parses native and web invite URLs', () => {
    expect(parseTeamInviteUrl('wordkrush://team?code=AB23CD')).toBe('AB23CD');
    expect(parseTeamInviteUrl('https://wordkrush.com/?team=ab23cd')).toBe('AB23CD');
    expect(parseTeamInviteUrl('https://wordkrush.com/team/AB23CD')).toBe('AB23CD');
    expect(parseTeamInviteUrl('https://wordkrush.com/#access_token=nope')).toBeNull();
  });

  it('builds a shareable URL', () => {
    expect(teamInviteUrl('ab23cd')).toBe('wordkrush://team?code=AB23CD');
    expect(teamInviteUrl('AB23CD', 'https://wordkrush.com')).toBe(
      'https://wordkrush.com/?team=AB23CD',
    );
  });
});
