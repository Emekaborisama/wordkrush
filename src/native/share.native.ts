/**
 * iOS / Android share sheet.
 *
 * Metro resolves this file on native and `share.ts` on web, so calling code
 * never branches on platform. React Native's `Share` is the same API
 * TeamsScreen already uses for invite URLs — no extra dependency.
 */
import { Share } from 'react-native';
import type { ShareOutcome } from './share-types';

export type { ShareOutcome };

export async function shareResult(text: string): Promise<ShareOutcome> {
  try {
    const result = await Share.share({ message: text });
    if (result.action === Share.dismissedAction) return 'dismissed';
    return 'shared';
  } catch {
    return 'failed';
  }
}
