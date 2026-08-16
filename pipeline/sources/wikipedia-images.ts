/**
 * Fetches lead images for Wikipedia articles — and, critically, their licences.
 *
 * WHY THE LICENCE CHECK IS NOT OPTIONAL:
 * Wikipedia hosts two kinds of image. Freely-licensed files (public domain,
 * CC0, CC BY, CC BY-SA) may be redistributed by anyone. Non-free files are
 * hosted under US fair-use rules that cover *Wikipedia*, not us — shipping one
 * in an App Store app is copyright infringement. Album art, film posters and
 * many corporate logos fall in that second bucket.
 *
 * So: fetch the licence with the image, ship only free ones, and record the
 * attribution that CC BY / CC BY-SA legally require.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'moreless-game/0.1 (https://github.com/Emekaborisama/more-or-less-game)';

const CONCURRENCY = 4;

export type ImageInfo = {
  url: string;
  /** Human-readable credit, e.g. "Jane Doe" — required by CC BY / CC BY-SA. */
  attribution: string;
  license: string;
  /** Wikimedia file page, so attribution can link back to the source. */
  filePage: string;
  /** Non-copyright caution tags (trademarked / insignia / personality). */
  restrictions: string;
};

/**
 * Wikimedia's `Restrictions` field flags laws OTHER than copyright. Copyright
 * itself is governed by `LicenseShortName`, which we check separately.
 *
 *   trademarked — don't imply endorsement or use as your own branding
 *   insignia    — official-use caution on flags and coats of arms
 *   personality — publicity rights of a living person
 *   currency    — reproduction rules for banknotes
 *
 * None of these bar redistribution of a freely-licensed image shown alongside
 * factual information, which is what a trivia card is. They WOULD matter if we
 * used a logo as app branding or implied someone endorses the game.
 *
 * Recorded per item so it stays reviewable, and boarded for legal sign-off
 * before submission/monetisation rather than quietly assumed fine.
 */
const NON_COPYRIGHT_RESTRICTIONS =
  /^(trademarked|insignia|personality|currency|design|costume|communist)$/i;

export function isBlockingRestriction(restrictions: string | undefined): boolean {
  if (!restrictions) return false;
  // Field can hold several tags joined by "|".
  return restrictions
    .split('|')
    .map((r) => r.trim())
    .filter(Boolean)
    .some((r) => !NON_COPYRIGHT_RESTRICTIONS.test(r));
}

/**
 * Licences we may redistribute. Deliberately an ALLOWLIST: an unrecognised
 * licence string is rejected rather than assumed safe. A missing image costs
 * us a nicer card; a wrong one costs us a legal problem.
 */
const FREE_LICENSE = /^(cc0|cc[ -]by([ -]sa)?([ -][\d.]+)?|public domain|pd(-|$)|no restrictions)/i;

export function isFreeLicense(license: string | undefined): boolean {
  if (!license) return false;
  const normalized = license.trim().toLowerCase();
  // Explicit rejects first — some files carry a free-sounding tag plus a
  // non-free qualifier.
  if (/fair use|non-?free|copyright|all rights reserved/i.test(normalized)) return false;
  return FREE_LICENSE.test(normalized);
}

/** Strip the HTML Wikimedia returns in attribution fields. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function get(params: Record<string, string>): Promise<any> {
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia API ${res.status} for ${JSON.stringify(params)}`);
  return res.json();
}

async function fetchOne(article: string, thumbWidth: number): Promise<ImageInfo | null> {
  // 1. Which file is the article's lead image?
  const page = await get({
    action: 'query',
    prop: 'pageimages',
    piprop: 'name',
    titles: article,
    redirects: '1',
  });
  const fileName = page?.query?.pages?.[0]?.pageimage;
  if (!fileName) return null;

  // 2. Its licence and a thumbnail URL.
  const file = await get({
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'extmetadata|url',
    iiurlwidth: String(thumbWidth),
    titles: `File:${fileName}`,
  });
  const info = file?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  const license: string = meta.LicenseShortName?.value ?? '';

  if (!isFreeLicense(license)) {
    console.warn(`  skipped (licence "${license || 'unknown'}"): ${article}`);
    return null;
  }
  const restrictions: string = meta.Restrictions?.value ?? '';
  if (isBlockingRestriction(restrictions)) {
    console.warn(`  skipped (restriction "${restrictions}"): ${article}`);
    return null;
  }

  const url: string | undefined = info.thumburl ?? info.url;
  if (!url) return null;

  return {
    url,
    attribution: stripHtml(meta.Artist?.value ?? '') || 'Wikimedia Commons',
    license: license || 'unknown',
    filePage: info.descriptionurl ?? '',
    restrictions,
  };
}

/** Fetch images for many articles, bounded concurrency. Missing/non-free -> absent from the map. */
export async function fetchImages(
  articles: string[],
  thumbWidth = 400,
): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>();
  const queue = [...articles];

  async function worker() {
    for (;;) {
      const article = queue.shift();
      if (article === undefined) return;
      try {
        const info = await fetchOne(article, thumbWidth);
        if (info) out.set(article, info);
      } catch (err) {
        // One bad article must not sink a whole content build.
        console.warn(`  image fetch failed for ${article}: ${(err as Error).message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, articles.length) }, worker));
  return out;
}
