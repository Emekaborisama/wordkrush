/**
 * Web share: the card image and its link, through the Web Share API, with
 * the link on the clipboard as the last resort.
 *
 * Metro resolves `share.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform. See docs/HOW-IT-WORKS.md §2.
 *
 * In order:
 *   1. The card PNG as a file, with the caption and link as its text. Phone
 *      browsers hand that to WhatsApp, Instagram, X or Messages as a picture.
 *   2. The link alone, with the caption. Every chat app unfurls it to the
 *      same card, so a browser that cannot share files still sends the image.
 *   3. The caption and link on the clipboard.
 *
 * THE CARD IS FETCHED BEFORE THE TAP. A browser only lets a page open the
 * share sheet straight after a tap, and Safari withdraws that if the tap
 * first waits on a network fetch. So the screen calls `prepareShareImage`
 * when a result appears, and `sharePayload` attaches the file only if it
 * already arrived. Otherwise it shares the link, which shows the same card.
 *
 * No extra dependency: `navigator.share`, `fetch`, `File` and
 * `navigator.clipboard` are the platform APIs. A dismissed sheet is a
 * decision, not a failure.
 */
import { captionWithLink, type SharePayload } from '../games/share';
import type { ShareOutcome } from './share-types';

export type { ShareOutcome };

/** Cards fetched or on their way, by image URL. `null` once a fetch failed. */
const cards = new Map<string, File | null | 'pending'>();

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * The card's path on this site. Fetched same-origin, so a preview deploy or
 * a local server serves its own render and no cross-origin request is made.
 */
function sameOriginPath(imageUrl: string): string {
  try {
    return new URL(imageUrl).pathname;
  } catch {
    return imageUrl;
  }
}

/** Start fetching the card so a later tap can attach it at once. Safe to call on every render. */
export function prepareShareImage(payload: SharePayload): void {
  if (cards.has(payload.imageUrl) || typeof fetch !== 'function' || typeof File !== 'function') return;
  cards.set(payload.imageUrl, 'pending');
  void (async () => {
    try {
      const response = await fetch(sameOriginPath(payload.imageUrl));
      // The dev server answers any path with the app's HTML; only a PNG is a card.
      if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith('image/png')) {
        cards.set(payload.imageUrl, null);
        return;
      }
      const blob = await response.blob();
      cards.set(payload.imageUrl, new File([blob], payload.fileName, { type: 'image/png' }));
    } catch {
      cards.set(payload.imageUrl, null);
    }
  })();
}

/** The card, if it has already arrived. Never waits: see the note above. */
function readyCard(payload: SharePayload): File | null {
  const card = cards.get(payload.imageUrl);
  return card instanceof File ? card : null;
}

export async function sharePayload(payload: SharePayload): Promise<ShareOutcome> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;

  if (nav !== undefined && typeof nav.share === 'function') {
    const card = readyCard(payload);
    if (card && typeof nav.canShare === 'function' && nav.canShare({ files: [card] })) {
      try {
        // With a file attached, most targets drop `url`, so the link rides in the text.
        await nav.share({ files: [card], title: 'WordKrush', text: captionWithLink(payload) });
        return 'shared';
      } catch (error) {
        if (isAbort(error)) return 'dismissed';
        // A target that refuses files: send the link, which unfurls to the card.
      }
    }
    try {
      await nav.share({ title: 'WordKrush', text: payload.caption, url: payload.url });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'dismissed';
      // Permission denied or an unsupported payload: try the clipboard.
    }
  }

  if (nav !== undefined && typeof nav.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(captionWithLink(payload));
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}

/** Test seam: forget every fetched card. */
export function resetShareImages(): void {
  cards.clear();
}
