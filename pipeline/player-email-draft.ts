/**
 * Turn week news into branded HTML.
 *
 * OpenAI writes player voice from the facts. A deterministic fallback is used
 * when the key is missing or the model returns junk. Merge tags stay exact so
 * Resend can fill the player's name and favorite game.
 */
import { PLAY_URL, UNSUBSCRIBE_TOKEN, emailHeroUrl, escapeHtml, pickEmailHero } from './player-email-html';
import { newsFacts, stripMd, type WeekNews } from './player-email-news';

export const FIRST_NAME_TOKEN = '{{{contact.first_name|there}}}';
export const GAME_TOKEN = '{{{game|the games}}}';

export type EmailDraft = {
  subject: string;
  preview: string;
  eyebrow: string;
  headline: string;
  intro: string;
  sections: { label: string; body: string }[];
  ctaLabel: string;
};

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'preview', 'eyebrow', 'headline', 'intro', 'sections', 'ctaLabel'],
  properties: {
    subject: { type: 'string' },
    preview: { type: 'string' },
    eyebrow: { type: 'string' },
    headline: { type: 'string' },
    intro: { type: 'string' },
    sections: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'body'],
        properties: {
          label: { type: 'string' },
          body: { type: 'string' },
        },
      },
    },
    ctaLabel: { type: 'string' },
  },
} as const;

export const EMAIL_SYSTEM_PROMPT = `You write a short WordKrush player email from facts you are given.

WordKrush is a casual game collection (More or Less, Clueless, Wordfall). Players are not technical.

Rules:
- Only use the supplied facts. Never invent a mechanic, score, or feature.
- Sell the feeling of playing, not the changelog. No version numbers, PRs, GitHub, migrations, "we shipped", or internal ids (D-0xx, ST-xx).
- Short. Active voice. Contractions. One idea per section.
- intro MUST contain this exact token once: ${FIRST_NAME_TOKEN}
- intro MUST also contain this exact token once: ${GAME_TOKEN}
- Do not use HTML tags or angle brackets.
- 1–4 sections. Labels are 2–5 words, gold-eyebrow style (e.g. "Race your friends").
- subject ≤ 70 characters. headline ≤ 60.`;

export function fallbackDraft(news: WeekNews): EmailDraft {
  const sections: EmailDraft['sections'] = [];
  if (news.wordfall) {
    sections.push({
      label: 'This week’s Wordfall',
      body: `${news.wordfall.name}. ${news.wordfall.description} Dropped Monday.`,
    });
  }
  for (const bullet of news.bullets.slice(0, 3)) {
    const plain = stripMd(bullet.text);
    const cut = plain.split(/(?<=\.)\s/)[0] ?? plain;
    sections.push({
      label: bullet.section === 'Fixed' ? 'Feels better' : 'What’s new',
      body: cut.length > 180 ? `${cut.slice(0, 177)}…` : cut,
    });
  }
  if (sections.length === 0) {
    sections.push({
      label: 'What’s new',
      body: 'Jump back in and keep a streak alive.',
    });
  }
  const headline = news.wordfall?.name ?? 'The games moved';
  return {
    subject: news.wordfall ? `This week’s Wordfall: ${news.wordfall.name}` : 'Fresh ways to play',
    preview: news.wordfall
      ? `${news.wordfall.name}. Dropped Monday.`
      : 'A few things you’ll feel the next time you play.',
    eyebrow: 'This week',
    headline,
    intro: `Hey ${FIRST_NAME_TOKEN} — you’ve been on ${GAME_TOKEN}. Here’s what changed.`,
    sections: sections.slice(0, 4),
    ctaLabel: news.wordfall ? 'Play Wordfall' : 'Play now',
  };
}

export function parseEmailDraft(raw: unknown): EmailDraft {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Email draft was not an object.');
  }
  const record = raw as Record<string, unknown>;
  const subject = requiredString(record, 'subject', 70);
  const preview = requiredString(record, 'preview', 120);
  const eyebrow = requiredString(record, 'eyebrow', 40);
  const headline = requiredString(record, 'headline', 80);
  const intro = requiredString(record, 'intro', 280);
  const ctaLabel = requiredString(record, 'ctaLabel', 32);
  if (!intro.includes(FIRST_NAME_TOKEN) || !intro.includes(GAME_TOKEN)) {
    throw new Error('Email draft intro is missing personalization tokens.');
  }
  if (!Array.isArray(record.sections) || record.sections.length < 1 || record.sections.length > 4) {
    throw new Error('Email draft needs 1–4 sections.');
  }
  const sections = record.sections.map((section, index) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      throw new Error(`Email draft section ${index} is invalid.`);
    }
    const row = section as Record<string, unknown>;
    return {
      label: requiredString(row, 'label', 40),
      body: requiredString(row, 'body', 280),
    };
  });
  return { subject, preview, eyebrow, headline, intro, sections, ctaLabel };
}

export function renderDraftHtml(draft: EmailDraft, news: WeekNews): string {
  const href = escapeHtml(`${PLAY_URL}&utm_campaign=weekly&utm_content=${news.weekMonday}`);
  const hero = pickEmailHero(news);
  const heroSrc = escapeHtml(emailHeroUrl(hero));
  const heroAlt = escapeHtml(hero.alt);
  const sectionHtml = draft.sections
    .map((section, index) => {
      const last = index === draft.sections.length - 1;
      return `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#FFB020;">
                  ${escapeKeepingTokens(section.label)}
                </p>
                <p style="margin:0 0 ${last ? '28' : '22'}px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#C5BED8;">
                  ${escapeKeepingTokens(section.body)}
                </p>`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeKeepingTokens(draft.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0A0817;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0A0817;">
      ${escapeKeepingTokens(draft.preview)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0817;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding:0 8px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;">
                <span style="color:#FFF9F6;">Word</span><span style="color:#FFB020;">Krush</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#1A1732;border:1px solid #332D55;border-radius:18px;padding:32px 28px;">
                <a href="${href}" style="display:block;margin:0 0 22px 0;text-decoration:none;">
                  <img src="${heroSrc}" width="424" alt="${heroAlt}" style="display:block;width:100%;max-width:424px;height:auto;border:0;border-radius:14px;" />
                </a>
                <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#FFB020;">
                  ${escapeKeepingTokens(draft.eyebrow)}
                </p>
                <h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;color:#FFF9F6;">
                  ${escapeKeepingTokens(draft.headline)}
                </h1>
                <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#C5BED8;">
                  ${escapeKeepingTokens(draft.intro)}
                </p>
                ${sectionHtml}
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:14px;background-color:#FFB020;">
                      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#0A0817;text-decoration:none;">
                        ${escapeKeepingTokens(draft.ctaLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#87809E;">
                You’re getting this because you have a WordKrush account. <a href="${UNSUBSCRIBE_TOKEN}" style="color:#87809E;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export function openaiUserPrompt(news: WeekNews): string {
  return `Write this week's player email from these facts only:\n${newsFacts(news)}`;
}

export async function draftWithOpenAI(
  news: WeekNews,
  fetchImpl: typeof fetch,
  apiKey: string,
  model = process.env.OPENAI_EMAIL_MODEL ?? 'gpt-4o-mini',
): Promise<EmailDraft> {
  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: EMAIL_SYSTEM_PROMPT },
        { role: 'user', content: openaiUserPrompt(news) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'player_email', strict: true, schema: DRAFT_SCHEMA },
      },
    }),
  });
  const body = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? 'OpenAI draft failed');
  }
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty draft.');
  return parseEmailDraft(JSON.parse(content) as unknown);
}

function requiredString(record: Record<string, unknown>, key: string, max: number): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Email draft ${key} is missing.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new Error(`Email draft ${key} is too long.`);
  }
  if (/[<>]/.test(trimmed.replaceAll(FIRST_NAME_TOKEN, '').replaceAll(GAME_TOKEN, ''))) {
    throw new Error(`Email draft ${key} contains HTML.`);
  }
  return trimmed;
}

function escapeKeepingTokens(value: string): string {
  const tokens = [FIRST_NAME_TOKEN, GAME_TOKEN, UNSUBSCRIBE_TOKEN];
  let escaped = value;
  const holes: string[] = [];
  tokens.forEach((token, index) => {
    const hole = `\u0000${index}\u0000`;
    holes.push(token);
    escaped = escaped.split(token).join(hole);
  });
  escaped = escapeHtml(escaped);
  holes.forEach((token, index) => {
    escaped = escaped.split(`\u0000${index}\u0000`).join(token);
  });
  return escaped;
}
