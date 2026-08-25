import type { WeekNews } from './player-email-news';

export const PLAY_URL =
  'https://wordkrush.com/?utm_source=email&utm_medium=product-update';
export const UNSUBSCRIBE_TOKEN = '{{{RESEND_UNSUBSCRIBE_URL}}}';
export const SITE_URL = 'https://wordkrush.com';

export type EmailHeroFile = 'hub.png' | 'more-or-less.png' | 'clueless.png' | 'wordfall.png';

export type EmailHero = {
  file: EmailHeroFile;
  alt: string;
};

/** Pick a real in-game picture from this week’s facts, not the lockup. */
export function pickEmailHero(news: WeekNews): EmailHero {
  if (news.wordfall) {
    return { file: 'wordfall.png', alt: `${news.wordfall.name} — Wordfall on WordKrush` };
  }
  const blob = news.bullets.map((bullet) => bullet.text).join(' ').toLowerCase();
  if (/\bclueless\b/.test(blob)) {
    return { file: 'clueless.png', alt: 'Clueless on WordKrush' };
  }
  if (/\bmore or less\b|\bmore-or-less\b/.test(blob)) {
    return { file: 'more-or-less.png', alt: 'More or Less on WordKrush' };
  }
  if (/\bwordfall\b/.test(blob)) {
    return { file: 'wordfall.png', alt: 'Wordfall on WordKrush' };
  }
  return { file: 'hub.png', alt: 'WordKrush — pick a game' };
}

export function emailHeroUrl(hero: EmailHero): string {
  return `${SITE_URL}/email/${hero.file}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
