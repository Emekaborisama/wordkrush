/**
 * Fetches images for Wikipedia articles — and, critically, their licences.
 *
 * WHY THE LICENCE CHECK IS NOT OPTIONAL:
 * Wikipedia hosts two kinds of image. Freely-licensed files (public domain,
 * CC0, CC BY, CC BY-SA) may be redistributed by anyone. Non-free files are
 * hosted under US fair-use rules that cover *Wikipedia*, not us — shipping one
 * in an App Store app is copyright infringement. Album art, film posters and
 * many corporate logos fall in that second bucket.
 *
 * The article lead (`pageimages`, free-only) is the happy path. Corporate
 * pages often have a fair-use logo or screenshot there, so `pageimages`
 * returns nothing. Those pages still have CC/PD photos in the body
 * (headquarters, hardware, events). Walk those next; still skip fair-use.
 *
 * So: fetch the licence with the image, ship only free ones, and record the
 * attribution that CC BY / CC BY-SA legally require.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const MEDIA_LIST = 'https://en.wikipedia.org/api/rest_v1/page/media-list';
const USER_AGENT = 'wordkrush/0.1 (https://wordkrush.com)';

const CONCURRENCY = 4;
/** Licence checks after the lead image misses. Enough to find a photo; not a crawl. */
export const MAX_FALLBACK_CHECKS = 12;

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

export function asFileTitle(name: string): string {
  return /^file:/i.test(name) ? name : `File:${name}`;
}

export function fileTitleName(title: string): string {
  return title.replace(/^file:/i, '').trim();
}

/**
 * Navbox / template chrome that is on almost every article and is never a
 * usable card image. Licence-checking these would be wasted requests.
 */
const WIKI_CHROME =
  /^(commons-logo|ambox|wiki[_ ]|wikimedia|wikidata|oojs[ _]ui|gnome-mime|padlock|edit-clear|text_document|increase|decrease|steady|symbol[_ ]|star[_ ]|sound-icon|red[_ ]pog|crystal[_ ]clear|folder[_ ]|question[_ ]book|semi-protection|protection-unlocked|unbalanced[_ ]scales|office-book|portal-|edit[_ ]icon|lock-gray|speaker[_ ]icon|wikt-|cscr-)/i;

export function isWikiChromeFile(title: string): boolean {
  return WIKI_CHROME.test(fileTitleName(title));
}

function extensionRank(title: string): number {
  const ext = (fileTitleName(title).split('.').pop() ?? '').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 0;
  if (ext === 'png' || ext === 'gif') return 1;
  if (ext === 'svg') return 2;
  return 3;
}

function relevanceRank(title: string, article: string): number {
  const stem = article.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!stem) return 2;
  const compact = fileTitleName(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (compact.startsWith(stem)) return 0;
  if (compact.includes(stem)) return 1;
  return 2;
}

/** Photos before logos/maps; names that mention the article before unrelated files. */
export function preferPhotoFirst(titles: string[], article: string): string[] {
  return [...titles].sort((a, b) => {
    const ext = extensionRank(a) - extensionRank(b);
    if (ext !== 0) return ext;
    const rel = relevanceRank(a, article) - relevanceRank(b, article);
    if (rel !== 0) return rel;
    return fileTitleName(a).localeCompare(fileTitleName(b));
  });
}

export function selectFallbackCandidates(
  fileTitles: string[],
  article: string,
  skip: ReadonlySet<string> = new Set(),
): string[] {
  const skipNorm = new Set([...skip].map((title) => asFileTitle(title).toLowerCase()));
  const kept = fileTitles.filter((title) => {
    if (isWikiChromeFile(title)) return false;
    if (skipNorm.has(asFileTitle(title).toLowerCase())) return false;
    return true;
  });
  return preferPhotoFirst(kept, article);
}

async function get(params: Record<string, string>): Promise<any> {
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia API ${res.status} for ${JSON.stringify(params)}`);
  return res.json();
}

async function fetchLeadFileName(article: string): Promise<string | null> {
  const page = await get({
    action: 'query',
    prop: 'pageimages',
    piprop: 'name',
    titles: article,
    redirects: '1',
  });
  const fileName = page?.query?.pages?.[0]?.pageimage;
  return typeof fileName === 'string' && fileName ? fileName : null;
}

async function listPageMedia(article: string): Promise<string[]> {
  const restUrl = `${MEDIA_LIST}/${encodeURIComponent(article.replace(/ /g, '_'))}`;
  const res = await fetch(restUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (res.ok) {
    const data: { items?: Array<{ type?: string; title?: string }> } = await res.json();
    return (data.items ?? [])
      .filter((item) => item.type === 'image' && typeof item.title === 'string')
      .map((item) => item.title as string);
  }

  const page = await get({
    action: 'query',
    prop: 'images',
    imlimit: '50',
    titles: article,
    redirects: '1',
  });
  const images: Array<{ title?: string }> = page?.query?.pages?.[0]?.images ?? [];
  return images.filter((image) => typeof image.title === 'string').map((image) => image.title as string);
}

async function fetchFileInfo(fileTitle: string, thumbWidth: number): Promise<ImageInfo | null> {
  const file = await get({
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'extmetadata|url',
    iiurlwidth: String(thumbWidth),
    titles: asFileTitle(fileTitle),
  });
  const info = file?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  const license: string = meta.LicenseShortName?.value ?? '';

  if (!isFreeLicense(license)) return null;
  const restrictions: string = meta.Restrictions?.value ?? '';
  if (isBlockingRestriction(restrictions)) return null;

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

async function fetchOne(article: string, thumbWidth: number): Promise<ImageInfo | null> {
  const leadName = await fetchLeadFileName(article);
  if (leadName) {
    const lead = await fetchFileInfo(leadName, thumbWidth);
    if (lead) return lead;
  }

  const media = await listPageMedia(article);
  const skip = new Set(leadName ? [asFileTitle(leadName)] : []);
  const candidates = selectFallbackCandidates(media, article, skip).slice(0, MAX_FALLBACK_CHECKS);
  for (const title of candidates) {
    const info = await fetchFileInfo(title, thumbWidth);
    if (info) return info;
  }
  console.warn(`  no freely-licensed image: ${article}`);
  return null;
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
