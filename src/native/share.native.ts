/**
 * iOS / Android share sheet.
 *
 * Metro resolves this file on native and `share.ts` on web, so calling code
 * never branches on platform. React Native's `Share` is core, so there is no
 * extra dependency.
 *
 * The card reaches the friend as the link's preview: iOS builds a rich link
 * (the card image) from `url` in Messages and most apps, and Android chat
 * apps unfurl the link in the text. Attaching the PNG as a file on native
 * would need expo-sharing and expo-file-system, two new dependencies, for a
 * surface that is not shipped yet; that is a later, separate call.
 */
import { Platform, Share } from 'react-native';
import { captionWithLink, type SharePayload } from '../games/share';
import type { ShareOutcome } from './share-types';

export type { ShareOutcome };

/** Nothing to fetch on native: the link carries the card. */
export function prepareShareImage(_payload: SharePayload): void {}

export async function sharePayload(payload: SharePayload): Promise<ShareOutcome> {
  try {
    // iOS takes the link as `url` (a rich preview); Android only reads `message`.
    const content =
      Platform.OS === 'ios'
        ? { message: payload.caption, url: payload.url }
        : { message: captionWithLink(payload), title: 'WordKrush' };
    const result = await Share.share(content, { subject: 'WordKrush' });
    if (result.action === Share.dismissedAction) return 'dismissed';
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Test seam, to match the web twin. */
export function resetShareImages(): void {}
