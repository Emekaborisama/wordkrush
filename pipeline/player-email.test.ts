import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  isSkippableRecipient,
  parseArgs,
  parseMode,
  planPlayerEmail,
  renderWeeklyHtml,
  thisWeekWordfall,
  usernameOf,
  weeklyBroadcastName,
  WHATS_NEW_BROADCAST_NAME,
} from './player-email';

const whatsNew = '<html>whats-new {{{RESEND_UNSUBSCRIBE_URL}}}</html>';
const weekly = {
  number: 12,
  name: 'Gauntlet',
  description: 'Clear eight crates before the board fills.',
  availableFrom: '2026-08-24',
};
const launch = {
  number: 1,
  name: 'First Words',
  description: 'Find six words.',
};

describe('parseArgs', () => {
  it('defaults to a dry auto run', () => {
    expect(parseArgs([])).toEqual({ send: false, mode: 'auto' });
  });

  it('lets --dry-run win over --send', () => {
    expect(parseArgs(['--send', '--dry-run', '--mode', 'weekly'])).toEqual({
      send: false,
      mode: 'weekly',
    });
  });

  it('rejects an unknown mode', () => {
    expect(() => parseMode('blast')).toThrow(/auto, whats-new, or weekly/);
  });
});

describe('thisWeekWordfall', () => {
  it('returns only a dated drop whose Monday is this week', () => {
    const now = new Date('2026-08-25T12:00:00');
    expect(thisWeekWordfall([launch, weekly], now)).toEqual(weekly);
    expect(thisWeekWordfall([launch, weekly], new Date('2026-08-23T12:00:00'))).toBeNull();
    expect(thisWeekWordfall([launch, weekly], new Date('2026-08-31T12:00:00'))).toBeNull();
  });
});

describe('planPlayerEmail', () => {
  it('prefers this week’s Wordfall in auto mode', () => {
    const plan = planPlayerEmail('auto', [launch, weekly], new Date('2026-08-25T12:00:00'), whatsNew);
    expect(plan?.name).toBe(weeklyBroadcastName('2026-08-24'));
    expect(plan?.subject).toContain('Gauntlet');
    expect(plan?.html).toContain('Gauntlet');
    expect(plan?.html).toContain('Clear eight crates before the board fills.');
    expect(plan?.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(plan?.html).not.toContain('<script>');
  });

  it('falls back to the product roundup when no drop is live this week', () => {
    const plan = planPlayerEmail('auto', [launch], new Date('2026-08-25T12:00:00'), whatsNew);
    expect(plan?.name).toBe(WHATS_NEW_BROADCAST_NAME);
    expect(plan?.html).toBe(whatsNew);
  });

  it('fails closed in weekly mode when the catalog has no drop', () => {
    expect(() =>
      planPlayerEmail('weekly', [launch], new Date('2026-08-25T12:00:00'), whatsNew),
    ).toThrow(/No Wordfall drop this week/);
  });

  it('escapes a hostile level name so it cannot break the HTML', () => {
    const html = renderWeeklyHtml({
      number: 12,
      name: '<script>x</script>',
      description: 'a & b',
    });
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('a &amp; b');
    expect(html).not.toContain('<script>x</script>');
  });
});

describe('recipients', () => {
  it('skips the local test player and anyone without an email', () => {
    expect(isSkippableRecipient(undefined, 'me@x.com')).toBe(true);
    expect(isSkippableRecipient('ai-tester@invalid.wordkrush', undefined)).toBe(true);
    expect(isSkippableRecipient('Me@X.com', 'me@x.com')).toBe(true);
    expect(isSkippableRecipient('player@example.com', 'me@x.com')).toBe(false);
  });

  it('reads the public username, not the email local-part', () => {
    expect(usernameOf({ username: 'Nova' })).toBe('Nova');
    expect(usernameOf({})).toBeUndefined();
  });
});

describe('escapeHtml', () => {
  it('escapes quotes as well as tags', () => {
    expect(escapeHtml('"hi"')).toBe('&quot;hi&quot;');
  });
});
