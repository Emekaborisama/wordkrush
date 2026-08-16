import { describe, expect, it } from 'vitest';
import { defaultWindow, encodeArticle, median } from './wikipedia';

describe('encodeArticle', () => {
  it('converts spaces to underscores', () => {
    expect(encodeArticle('Blue whale')).toBe('Blue_whale');
  });

  it('percent-encodes accents', () => {
    // This exact case broke a live call: "Beyoncé" raw threw UnicodeEncodeError.
    expect(encodeArticle('Beyoncé')).toBe('Beyonc%C3%A9');
  });

  it('encodes characters that would break the URL path', () => {
    expect(encodeArticle('AC/DC')).toBe('AC%2FDC');
    expect(encodeArticle('Tom & Jerry')).toBe('Tom_%26_Jerry');
    expect(encodeArticle('Who? (album)')).toBe('Who%3F_(album)');
  });

  it('leaves apostrophes alone — they are legal in a URL path', () => {
    // encodeURIComponent deliberately does not escape ' and the live
    // McDonald's fetch confirms Wikimedia accepts it unencoded.
    expect(encodeArticle("McDonald's")).toBe("McDonald's");
  });
});

describe('defaultWindow', () => {
  it('returns YYYYMMDD strings', () => {
    const { start, end } = defaultWindow();
    expect(start).toMatch(/^\d{8}$/);
    expect(end).toMatch(/^\d{8}$/);
  });

  it('starts on the first of a month and spans six months', () => {
    const { start, end } = defaultWindow();
    expect(start.slice(6)).toBe('01');
    const months =
      (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
      (Number(end.slice(4, 6)) - Number(start.slice(4, 6)));
    expect(months).toBe(5); // Feb 1 -> Jul 31 spans 6 complete months
  });

  it('excludes the current month', () => {
    // A month in progress returns a partial count, which would silently
    // deflate every item by an amount depending on the day we ran.
    const { end } = defaultWindow();
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(end.slice(0, 6)).not.toBe(currentMonth);
  });

  it('ends on the last day of the previous month', () => {
    const { end } = defaultWindow();
    const endDate = new Date(
      Date.UTC(Number(end.slice(0, 4)), Number(end.slice(4, 6)) - 1, Number(end.slice(6))),
    );
    const dayAfter = new Date(endDate.getTime() + 86_400_000);
    expect(dayAfter.getUTCDate()).toBe(1); // end is the last day of its month
  });

  it('starts before it ends', () => {
    const { start, end } = defaultWindow();
    expect(Number(start)).toBeLessThan(Number(end));
  });
});

describe('median', () => {
  it('returns the middle value for odd-length input', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle values for even-length input', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('ignores an extreme spike that would wreck the mean', () => {
    // Michael Jackson's real Feb-Jul 2026 shape: a biopic-driven 4.4M spike.
    const months = [834_083, 574_078, 2_855_246, 4_432_112, 2_442_317, 1_118_590];
    const mean = months.reduce((a, b) => a + b, 0) / months.length;
    expect(median(months)).toBeLessThan(mean);
  });

  it('throws on empty input rather than returning NaN', () => {
    expect(() => median([])).toThrow();
  });
});
