import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_EMAIL_MODEL,
  draftWithOpenRouter,
  fallbackDraft,
  FIRST_NAME_TOKEN,
  GAME_TOKEN,
  openRouterBaseUrl,
  openRouterChatCompletionsUrl,
  parseEmailDraft,
  renderDraftHtml,
} from './player-email-draft';
import type { WeekNews } from './player-email-news';

const news: WeekNews = {
  weekMonday: '2026-08-24',
  lookbackDays: 7,
  bullets: [
    {
      version: '0.8.3',
      date: '2026-08-25',
      section: 'Added',
      text: '**Teams are now CRUD.** The owner can rename or disband the crew.',
    },
  ],
  wordfall: {
    number: 12,
    name: 'Gauntlet',
    description: 'Clear eight crates before the board fills.',
    availableFrom: '2026-08-24',
  },
};

describe('fallbackDraft', () => {
  it('keeps Resend merge tags and stays inside the facts', () => {
    const draft = fallbackDraft(news);
    expect(draft.intro).toContain(FIRST_NAME_TOKEN);
    expect(draft.intro).toContain(GAME_TOKEN);
    expect(draft.subject).toContain('Gauntlet');
    expect(draft.sections.some((section) => section.body.includes('Gauntlet'))).toBe(true);
    expect(draft.sections.some((section) => section.body.includes('Teams are now CRUD'))).toBe(
      true,
    );
  });
});

describe('parseEmailDraft', () => {
  it('rejects a model that invents HTML or drops personalization', () => {
    expect(() =>
      parseEmailDraft({
        subject: 'Hi',
        preview: 'Hi',
        eyebrow: 'Week',
        headline: 'Hi',
        intro: 'Hey there',
        sections: [{ label: 'New', body: 'Stuff' }],
        ctaLabel: 'Play',
      }),
    ).toThrow(/personalization tokens/);
    expect(() =>
      parseEmailDraft({
        subject: 'Hi',
        preview: 'Hi',
        eyebrow: 'Week',
        headline: 'Hi',
        intro: `Hey ${FIRST_NAME_TOKEN} on ${GAME_TOKEN} <script>`,
        sections: [{ label: 'New', body: 'Stuff' }],
        ctaLabel: 'Play',
      }),
    ).toThrow(/HTML/);
  });
});

describe('renderDraftHtml', () => {
  it('leaves merge tags intact and escapes the rest', () => {
    const html = renderDraftHtml(
      {
        subject: 'Hi "you"',
        preview: 'Play',
        eyebrow: 'This week',
        headline: 'Gauntlet',
        intro: `Hey ${FIRST_NAME_TOKEN} — you’ve been on ${GAME_TOKEN}.`,
        sections: [{ label: 'New', body: 'a & b' }],
        ctaLabel: 'Play now',
      },
      news,
    );
    expect(html).toContain(FIRST_NAME_TOKEN);
    expect(html).toContain(GAME_TOKEN);
    expect(html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(html).toContain('a &amp; b');
    expect(html).toContain('Hi &quot;you&quot;');
    expect(html).toContain('utm_content=2026-08-24');
    expect(html).toContain('https://wordkrush.com/email/wordfall.png');
    expect(html).toContain('alt="Gauntlet — Wordfall on WordKrush"');
    expect(html).not.toContain('/og-image.png');
  });
});

describe('openRouterBaseUrl', () => {
  it('defaults empty GitHub secrets to the OpenRouter v1 root', () => {
    expect(openRouterBaseUrl({})).toBe(DEFAULT_OPENROUTER_BASE_URL);
    expect(openRouterBaseUrl({ OPENROUTER_BASE_URL: '  ' })).toBe(DEFAULT_OPENROUTER_BASE_URL);
    expect(openRouterBaseUrl({ OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1/' })).toBe(
      DEFAULT_OPENROUTER_BASE_URL,
    );
  });
});

describe('draftWithOpenRouter', () => {
  it('posts once to OpenRouter chat completions', async () => {
    const payload = {
      subject: 'Gauntlet dropped',
      preview: 'Play it',
      eyebrow: 'This week',
      headline: 'Gauntlet',
      intro: `Hey ${FIRST_NAME_TOKEN} — you’ve been on ${GAME_TOKEN}.`,
      sections: [{ label: 'Wordfall', body: 'Clear eight crates before the board fills.' }],
      ctaLabel: 'Play Wordfall',
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const draft = await draftWithOpenRouter(news, fetchImpl as unknown as typeof fetch, 'sk-test', {});
    expect(draft.subject).toBe('Gauntlet dropped');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(openRouterChatCompletionsUrl({}));
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test');
    expect(headers['HTTP-Referer']).toBe('https://wordkrush.com');
    const body = JSON.parse(String(init.body)) as { model: string };
    expect(body.model).toBe(DEFAULT_OPENROUTER_EMAIL_MODEL);
  });
});
