import { describe, expect, it } from 'vitest';
import { captionWithLink } from './share';
import { buildShareImageUrl, buildShareUrl, encodeShareData, shareFileName } from './share-data';

const STREAK = { game: 'streak', days: 4, best: 9 } as const;

describe('a share', () => {
  it('pastes as the caption with the link on its own line, and nothing else', () => {
    expect(captionWithLink({ caption: 'Can you keep up?', url: 'https://wordkrush.com/share/x' })).toBe(
      'Can you keep up?\nhttps://wordkrush.com/share/x',
    );
  });

  it('attaches the card the link unfurls to, served from the same token', () => {
    const token = encodeShareData(STREAK);
    expect(buildShareUrl(STREAK)).toBe(`https://wordkrush.com/share/${token}?utm_source=player&utm_medium=share`);
    expect(buildShareImageUrl(STREAK)).toBe(`https://wordkrush.com/share/${token}/og.png`);
  });

  it('names the attached file after the game', () => {
    expect(shareFileName('clueless')).toBe('wordkrush-clueless.png');
  });
});
