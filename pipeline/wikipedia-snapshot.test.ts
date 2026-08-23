import { describe, expect, it } from 'vitest';
import { MAX_SWING_VS_PREVIOUS } from './sanity';
import {
  compareSnapshots,
  formatRotateReport,
  itemId,
  nextPatchVersion,
  prependVersionSection,
  replaceDeclaredVersion,
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

describe('nextPatchVersion', () => {
  it('increments the patch number', () => {
    expect(nextPatchVersion('0.1.0')).toBe('0.1.1');
  });

  it('rejects a non-semver version', () => {
    expect(() => nextPatchVersion('1.0')).toThrow(/x\.y\.z/);
  });
});

describe('replaceDeclaredVersion', () => {
  it('rewrites the first version field and leaves the rest alone', () => {
    expect(replaceDeclaredVersion('{\n  "version": "0.1.0"\n}\n', '0.1.1')).toBe(
      '{\n  "version": "0.1.1"\n}\n',
    );
  });
});

describe('prependVersionSection', () => {
  it('inserts a new version above the current heading', () => {
    const md = `# Changelog\n\n## [0.1.0] - 2026-08-22\n\n### Added\n- old\n`;
    expect(prependVersionSection(md, '0.1.1', '2026-08-23', 'Changed', 'fresh')).toBe(
      `# Changelog\n\n## [0.1.1] - 2026-08-23\n\n### Changed\n- fresh\n\n## [0.1.0] - 2026-08-22\n\n### Added\n- old\n`,
    );
  });

  it('fails closed when no version heading exists', () => {
    expect(() => prependVersionSection('# Changelog\n', '0.1.1', '2026-08-23', 'Added', 'x')).toThrow(
      /no ## \[x\.y\.z\]/,
    );
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
