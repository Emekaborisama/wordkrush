/**
 * The HTML a scraper reads at `/share/:id`.
 *
 * This page has one job: describe ONE game result, unambiguously, to a crawler
 * that fetches it exactly once and renders whatever came back.
 *
 * It used to be the hub document with per-result `og:*` tags pattern-matched
 * over the top, which left the hub's `<meta name="description">`, its JSON-LD
 * (`url: https://wordkrush.com/`, describing the whole site) and its "Choose
 * your game" copy sitting underneath the result's tags. One document, two
 * claims: the card said More or Less, the body and the structured data said
 * WordKrush homepage. Anything that resolves those in the wrong order
 * describes the hub, and anything that refuses to guess shows nothing.
 *
 * So the hub's story is delimited at build time (`HEAD_MARKERS` / `COPY_MARKERS`
 * in `scripts/patch-web-head.mjs`) and replaced here as a whole. Nothing about
 * the homepage can survive, because nothing is matched — the block is swapped.
 *
 * The playable bundle is untouched, so a player who follows the link still
 * lands in the game. Only the parts that make a claim about what this page is
 * get rewritten.
 */
import { COPY_MARKERS, HEAD_MARKERS, escapeHtml } from '../scripts/patch-web-head.mjs';
import { cardId, cardImagePath } from './og-card.mjs';

export const SITE_URL = 'https://wordkrush.com';

/** The account a card is attributed to, per `SAME_AS` in the build script. */
const TWITTER_SITE = '@WordKrushGame';

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const GAME_TITLES = {
  'more-or-less': 'Higher or Lower',
  clueless: 'Clueless',
  wordfall: 'Wordfall',
  streak: 'Daily streak',
};

/**
 * What the card art shows. X uses it for accessibility, and writing it down
 * keeps the promise this page makes about the image honest.
 */
const IMAGE_ALT = {
  'more-or-less':
    'A Higher or Lower board: two stacked photo cards above the Higher and Lower buttons',
  clueless: 'A Clueless result: the spread of guesses from cold to found',
  wordfall: 'A Wordfall result: the word lengths cleared, longest last',
  streak: 'The WordKrush cat cheering beside a flame and the number of days in a row played',
};

/**
 * The invites a player sends: what the page says and what its card shows.
 * They describe an invitation rather than a result, so they carry no payload
 * beyond the room or team code already in the path.
 */
const INVITES = {
  duel: {
    title: 'WordKrush · 1v1 challenge',
    alt: 'The WordKrush cat beside "1v1 challenge: same pairs, one minute" and an Accept button',
    copy: 'Play Higher or Lower head to head, free in the browser.',
  },
  team: {
    title: 'WordKrush · Join my team',
    alt: 'The WordKrush cat beside "Join my team" and the invite code in letter tiles',
    copy: 'Race friends live in WordKrush, free in the browser.',
  },
};

export function gameTitle(game) {
  return GAME_TITLES[game];
}

/**
 * True when the shell carries the delimiters this module replaces.
 *
 * `warm()` checks this once at boot rather than letting every share request
 * discover it: a shell without the markers means the build script and the
 * server have drifted apart, and a share page would silently go back to
 * serving the homepage's description.
 */
export function hasShareMarkers(html) {
  return [...HEAD_MARKERS, ...COPY_MARKERS].every((marker) => html.includes(marker));
}

function replaceBlock(html, [start, end], replacement) {
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, 'g');
  return html.replace(pattern, () => replacement);
}

/**
 * The `<head>` block for one result. Absolute HTTPS URLs throughout — a
 * scraper does not resolve a relative image path.
 */
function shareHead({ title, description, pageUrl, imageUrl, imageAlt }) {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedAlt = escapeHtml(imageAlt);

  return [
    `<title>${escapedTitle}</title>`,
    `<meta name="description" content="${escapedDescription}"/>`,
    `<link rel="canonical" href="${pageUrl}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="WordKrush"/>`,
    `<meta property="og:title" content="${escapedTitle}"/>`,
    `<meta property="og:description" content="${escapedDescription}"/>`,
    `<meta property="og:url" content="${pageUrl}"/>`,
    `<meta property="og:image" content="${imageUrl}"/>`,
    `<meta property="og:image:secure_url" content="${imageUrl}"/>`,
    `<meta property="og:image:type" content="image/png"/>`,
    `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}"/>`,
    `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}"/>`,
    `<meta property="og:image:alt" content="${escapedAlt}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:site" content="${TWITTER_SITE}"/>`,
    `<meta name="twitter:title" content="${escapedTitle}"/>`,
    `<meta name="twitter:description" content="${escapedDescription}"/>`,
    `<meta name="twitter:image" content="${imageUrl}"/>`,
    `<meta name="twitter:image:alt" content="${escapedAlt}"/>`,
  ].join('');
}

/**
 * Crawler-readable copy for one result, replacing the hub's game list.
 *
 * Spoiler-free like the card: the standing, never the pair or the values.
 */
function shareCopy({ title, description, invitation }) {
  return [
    '<main id="wk-seo">',
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    `<p>${escapeHtml(invitation)}</p>`,
    '</main>',
  ].join('');
}

/** One page, one claim: the head and the crawler copy for a single card. */
function cardDocument(shellHtml, { title, description, pageUrl, imageUrl, imageAlt, invitation }) {
  const html = replaceBlock(
    shellHtml,
    HEAD_MARKERS,
    shareHead({ title, description, pageUrl, imageUrl, imageAlt }),
  );
  return replaceBlock(html, COPY_MARKERS, shareCopy({ title, description, invitation }));
}

/**
 * Build the share page for one result from the built shell.
 *
 * `shareId` is the canonical (already percent-decoded) id, so the URLs this
 * page declares are the same however the request that asked for it was encoded.
 *
 * The card is declared at `/og/share/{cardId}.png`, not at `/share/{shareId}/
 * og.png`. A scraper reading this page fetches whatever `og:image` says, and
 * the nested path made that a second dynamic route carrying the whole result
 * payload; the card id is short, flat and names only what the card draws. The
 * old path still serves the same bytes for anything that already cached it.
 */
export function shareDocument(shellHtml, { shareId, shareData, description, imageVersion }) {
  const name = gameTitle(shareData.game);
  const streak = shareData.game === 'streak';
  return cardDocument(shellHtml, {
    title: streak ? `WordKrush · ${shareData.days}-day streak` : `WordKrush · ${name}`,
    description,
    pageUrl: `${SITE_URL}/share/${shareId}`,
    imageUrl: `${SITE_URL}${cardImagePath(cardId(shareData))}?v=${imageVersion}`,
    imageAlt: IMAGE_ALT[shareData.game],
    invitation: streak ? 'Play WordKrush free in the browser.' : `Play ${name} free in the browser.`,
  });
}

/**
 * The page a 1v1 or team invite link unfurls to (`/duel/:room`,
 * `/team/:code`). It used to be the homepage's own tags, so a friend saw
 * "free word games" and the logo rather than an invitation. `pagePath` is the
 * canonical path the link used; `card` the card id from `og-card.mjs`.
 */
export function inviteDocument(shellHtml, { kind, pagePath, card, description, imageVersion }) {
  const invite = INVITES[kind];
  return cardDocument(shellHtml, {
    title: invite.title,
    description,
    pageUrl: `${SITE_URL}${pagePath}`,
    imageUrl: `${SITE_URL}${cardImagePath(card)}?v=${imageVersion}`,
    imageAlt: invite.alt,
    invitation: invite.copy,
  });
}
