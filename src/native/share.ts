/**
 * Web share, via the Web Share API with a clipboard fallback.
 *
 * Metro resolves `share.native.ts` on iOS/Android and this file on web, so
 * calling code never branches on platform. See docs/HOW-IT-WORKS.md §2.
 *
 * No extra dependency: `navigator.share` and `navigator.clipboard` are the
 * platform APIs. A dismissed sheet is a decision, not a failure.
 */
import type { ShareOutcome } from './share-types';

export type { ShareOutcome };

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function shareResult(text: string): Promise<ShareOutcome> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;

  if (nav !== undefined && typeof nav.share === 'function') {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'dismissed';
      // Permission denied or an unsupported payload — try the clipboard.
    }
  }

  if (nav !== undefined && typeof nav.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
