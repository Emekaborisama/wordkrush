import { describe, expect, it } from 'vitest';
import { MAX_SWING_VS_PREVIOUS } from './sanity';
import {
  appendUnreleasedBullet,
  compareSnapshots,
  formatRotateReport,
  itemId,
  swingRatio,
  type BundledItem,
} from './wikipedia-snapshot';

function item(partial: Partial<BundledItem> & Pick<BundledItem, 'id' | 'label' | 'value'>): BundledItem {
  return {
    categoryId: 'wikipedia-popularity',
    source: 'wikipedia-pageviews:20260201-20260731',
    updatedAt: '2026-08-16',
    ...partial,
  };
}

describe('itemId', () => {
  it('slugifies the Wikipedia title the same way preview does', () => {
    expect(itemId('wikipedia-popularity', 'Cristiano Ronaldo')).toBe(
      'wikipedia-popularity.cristiano-ronaldo',
    );
    expect(itemId('wikipedia-popularity', "McDonald's")).toBe('wikipedia-popularity.mcdonald-s');
  });
});

describe('compareSnapshots', () => {
  const pizza = item({ id: 'wikipedia-popularity.pizza', label: 'Pizza', value: 100_000 });
  const sushi = item({ id: 'wikipedia-popularity.sushi', label: 'Sushi', value: 80_000 });

  it('ignores updatedAt-only churn', () => {
    const next = [{ ...pizza, updatedAt: '2026-08-22' }, { ...sushi, updatedAt: '2026-08-22' }];
    const diff = compareSnapshots([pizza, sushi], next);
    expect(diff.materialChange).toBe(false);
    expect(diff.valueChanges).toEqual([]);
  });

  it('records a value change and a >10x swing', () => {
    const spiked = item({
      id: pizza.id,
      label: pizza.label,
      value: pizza.value * (MAX_SWING_VS_PREVIOUS + 1),
    });
    const diff = compareSnapshots([pizza, sushi], [spiked, sushi]);
    expect(diff.materialChange).toBe(true);
    expect(diff.valueChanges).toHaveLength(1);
    expect(diff.swings).toHaveLength(1);
    expect(diff.swings[0]?.ratio).toBe(MAX_SWING_VS_PREVIOUS + 1);
  });

  it('treats membership, source-window, and image changes as material', () => {
    const added = compareSnapshots([pizza], [pizza, sushi]);
    expect(added.added).toEqual([sushi.id]);
    expect(added.materialChange).toBe(true);

    const removed = compareSnapshots([pizza, sushi], [pizza]);
    expect(removed.removed).toEqual([sushi.id]);

    const windowed = compareSnapshots(
      [pizza],
      [{ ...pizza, source: 'wikipedia-pageviews:20260301-20260831' }],
    );
    expect(windowed.sourceChanged).toBe(true);

    const image = compareSnapshots(
      [pizza],
      [{ ...pizza, imageUrl: 'https://upload.wikimedia.org/example.jpg', imageLicense: 'Public domain', imageAttribution: 'A' }],
    );
    expect(image.imageChanges).toEqual([pizza.id]);
  });
});

describe('swingRatio', () => {
  it('is symmetric', () => {
    expect(swingRatio(10, 100)).toBe(10);
    expect(swingRatio(100, 10)).toBe(10);
  });
});

describe('appendUnreleasedBullet', () => {
  it('prepends under an existing Changed section', () => {
    const md = `## [Unreleased]\n\n### Changed\n- old line\n`;
    expect(appendUnreleasedBullet(md, 'Changed', 'new line')).toContain(
      '### Changed\n- new line\n- old line\n',
    );
  });

  it('creates the section when it is missing', () => {
    const md = `## [Unreleased]\n\n### Added\n- something\n`;
    const next = appendUnreleasedBullet(md, 'Changed', 'fresh');
    expect(next).toContain('### Changed\n- fresh\n');
  });
});

describe('formatRotateReport', () => {
  it('says there is no PR when nothing moved', () => {
    const report = formatRotateReport(
      {
        materialChange: false,
        added: [],
        removed: [],
        valueChanges: [],
        swings: [],
        sourceChanged: false,
        previousSource: 'wikipedia-pageviews:20260201-20260731',
        nextSource: 'wikipedia-pageviews:20260201-20260731',
        imageChanges: [],
      },
      50,
      0,
    );
    expect(report).toContain('No PR');
  });
});
