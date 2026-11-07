/**
 * Covers the web twin (`share.ts`) — the platform Metro picks for web and
 * the one Vitest resolves here. `share.native.ts` needs a device.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SharePayload } from '../games/share';
import { prepareShareImage, resetShareImages, sharePayload } from './share';

const PAYLOAD: SharePayload = {
  caption: 'Can you keep up?',
  url: 'https://wordkrush.com/share/abc?utm_source=player&utm_medium=share',
  imageUrl: 'https://wordkrush.com/share/abc/og.png',
  fileName: 'wordkrush-streak.png',
};
const PASTE = `Can you keep up?\n${PAYLOAD.url}`;

afterEach(() => {
  vi.unstubAllGlobals();
  resetShareImages();
});

function pngResponse() {
  return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'content-type': 'image/png' } });
}

/** Let the background fetch that `prepareShareImage` starts settle. */
async function settle() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('sharing a card', () => {
  it('attaches the card as a PNG file, with the caption and link as its text', async () => {
    const fetchCard = vi.fn().mockResolvedValue(pngResponse());
    vi.stubGlobal('fetch', fetchCard);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    prepareShareImage(PAYLOAD);
    await settle();
    await expect(sharePayload(PAYLOAD)).resolves.toBe('shared');

    // Same-origin path: a preview deploy or local server serves its own card.
    expect(fetchCard).toHaveBeenCalledWith('/share/abc/og.png');
    const sent = share.mock.calls[0][0];
    expect(sent.text).toBe(PASTE);
    expect(sent.files).toHaveLength(1);
    expect(sent.files[0].name).toBe('wordkrush-streak.png');
    expect(sent.files[0].type).toBe('image/png');
  });

  it('shares the link, which unfurls to the card, when the card has not arrived yet', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    prepareShareImage(PAYLOAD);
    // No waiting on the fetch: a browser withdraws the tap's permission to share.
    await expect(sharePayload(PAYLOAD)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'WordKrush', text: 'Can you keep up?', url: PAYLOAD.url });
  });

  it('does not attach a page the server sent instead of a PNG', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })));
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    prepareShareImage(PAYLOAD);
    await settle();
    await sharePayload(PAYLOAD);
    expect(share.mock.calls[0][0].files).toBeUndefined();
  });

  it('falls back to the link when the target refuses the file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pngResponse()));
    const share = vi.fn().mockRejectedValueOnce(new Error('DataError')).mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    prepareShareImage(PAYLOAD);
    await settle();
    await expect(sharePayload(PAYLOAD)).resolves.toBe('shared');
    expect(share).toHaveBeenLastCalledWith({ title: 'WordKrush', text: 'Can you keep up?', url: PAYLOAD.url });
  });

  it('treats a dismissed share sheet as dismissed, not failed', async () => {
    const abort = new Error('Share canceled');
    abort.name = 'AbortError';
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort), clipboard: { writeText: vi.fn() } });
    await expect(sharePayload(PAYLOAD)).resolves.toBe('dismissed');
  });

  it('copies the caption and link when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(sharePayload(PAYLOAD)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(PASTE);
  });

  it('copies when the share sheet rejects for a reason other than a dismissal', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('NotAllowedError')), clipboard: { writeText } });
    await expect(sharePayload(PAYLOAD)).resolves.toBe('copied');
  });

  it('fails quietly when neither path exists, or the clipboard refuses', async () => {
    vi.stubGlobal('navigator', {});
    await expect(sharePayload(PAYLOAD)).resolves.toBe('failed');
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } });
    await expect(sharePayload(PAYLOAD)).resolves.toBe('failed');
    vi.stubGlobal('navigator', undefined);
    await expect(sharePayload(PAYLOAD)).resolves.toBe('failed');
  });
});
