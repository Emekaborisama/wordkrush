import { describe, expect, it } from 'vitest';
import { isInviteCode, normalizeInviteCode, parseTeamInviteUrl, teamInviteUrl, teamSharePayload } from './codes';

describe('invite codes', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeInviteCode(' ab23cd ')).toBe('AB23CD');
    expect(isInviteCode('AB23CD')).toBe(true);
    // The alphabet drops 0/O/1/I so a spoken code still types.
    expect(isInviteCode('AB1OCD')).toBe(false);
    expect(isInviteCode('SHORT')).toBe(false);
  });

  it('parses native and web invite URLs', () => {
    expect(parseTeamInviteUrl('wordkrush://team?code=AB23CD')).toBe('AB23CD');
    expect(parseTeamInviteUrl('https://wordkrush.com/?team=ab23cd')).toBe('AB23CD');
    expect(parseTeamInviteUrl('https://wordkrush.com/team/AB23CD')).toBe('AB23CD');
    expect(parseTeamInviteUrl('https://wordkrush.com/#access_token=nope')).toBeNull();
  });

  it('builds a public https link on every platform, never a wordkrush:// one', () => {
    expect(teamInviteUrl('ab23cd')).toBe('https://wordkrush.com/team/AB23CD');
  });

  it('reads back the link it builds', () => {
    expect(parseTeamInviteUrl(teamInviteUrl('ab23cd'))).toBe('AB23CD');
  });
});

describe('a team invite share', () => {
  it('attaches the team card the server draws for that code', async () => {
    const { cardFromId } = await import('../../server/og-card.mjs');
    const share = teamSharePayload('ab23cd', 'Night Owls');
    expect(share.caption).toBe('Join Night Owls on WordKrush and race me live.');
    expect(share.url).toBe('https://wordkrush.com/team/AB23CD');
    expect(share.imageUrl).toBe('https://wordkrush.com/og/share/t_AB23CD.png');
    expect(cardFromId('t_AB23CD')).toEqual({ game: 'team', code: 'AB23CD' });
  });
});
