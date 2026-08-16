import { describe, expect, it } from 'vitest';
import { isBlockingRestriction, isFreeLicense, stripHtml } from './wikipedia-images';

describe('isFreeLicense', () => {
  it('accepts the free licences Wikimedia actually returns', () => {
    for (const l of [
      'CC0',
      'CC BY 4.0',
      'CC BY-SA 3.0',
      'CC BY-SA 4.0',
      'Public domain',
      'PD',
      'PD-US',
      'No restrictions',
    ]) {
      expect(isFreeLicense(l), l).toBe(true);
    }
  });

  it('rejects non-free licences', () => {
    // These are legal on Wikipedia under fair use, but not for us to ship.
    for (const l of ['Fair use', 'Non-free', 'Non-free fair use', 'All rights reserved']) {
      expect(isFreeLicense(l), l).toBe(false);
    }
  });

  it('rejects unknown or missing licences rather than assuming safe', () => {
    expect(isFreeLicense(undefined)).toBe(false);
    expect(isFreeLicense('')).toBe(false);
    expect(isFreeLicense('Some Bespoke Licence 2.0')).toBe(false);
  });

  it('rejects a free-sounding licence carrying a non-free qualifier', () => {
    expect(isFreeLicense('CC BY-SA 3.0 (non-free portions)')).toBe(false);
  });
});

describe('isBlockingRestriction', () => {
  it('permits non-copyright caution tags', () => {
    // Copyright is governed by the licence; these flag other laws and do not
    // bar redistribution of a freely-licensed image beside factual data.
    for (const r of ['trademarked', 'insignia', 'personality', 'currency']) {
      expect(isBlockingRestriction(r), r).toBe(false);
    }
  });

  it('permits several caution tags combined', () => {
    expect(isBlockingRestriction('trademarked|personality')).toBe(false);
  });

  it('blocks an unrecognised restriction', () => {
    expect(isBlockingRestriction('some-new-legal-thing')).toBe(true);
    expect(isBlockingRestriction('trademarked|some-new-legal-thing')).toBe(true);
  });

  it('treats absent restrictions as fine', () => {
    expect(isBlockingRestriction(undefined)).toBe(false);
    expect(isBlockingRestriction('')).toBe(false);
  });
});

describe('stripHtml', () => {
  it('extracts a plain credit from the HTML Wikimedia returns', () => {
    expect(stripHtml('<a href="https://x.com/y" rel="nofollow">Jane Doe</a>')).toBe('Jane Doe');
  });

  it('decodes entities and collapses whitespace', () => {
    expect(stripHtml('<span>Bob  &amp;\n  Alice</span>')).toBe('Bob & Alice');
  });
});
