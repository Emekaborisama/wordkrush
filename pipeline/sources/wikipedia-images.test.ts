import { describe, expect, it } from 'vitest';
import {
  isBlockingRestriction,
  isFreeLicense,
  isWikiChromeFile,
  preferPhotoFirst,
  selectFallbackCandidates,
  stripHtml,
} from './wikipedia-images';

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

describe('isWikiChromeFile', () => {
  it('skips template chrome that is on every article', () => {
    for (const title of [
      'File:Commons-logo.svg',
      'File:Gnome-mime-sound-openclipart.svg',
      'File:Question_book-new.svg',
      'File:OOjs_UI_icon_edit-ltr-progressive.svg',
      'File:Increase2.svg',
    ]) {
      expect(isWikiChromeFile(title), title).toBe(true);
    }
  });

  it('keeps real article photographs and logos', () => {
    expect(isWikiChromeFile('File:TikTok_Headquarters.jpg')).toBe(false);
    expect(isWikiChromeFile('File:Netflix_2015_logo.svg')).toBe(false);
    expect(isWikiChromeFile('File:PlayStation-SCPH-1000-with-Controller.jpg')).toBe(false);
  });
});

describe('preferPhotoFirst', () => {
  it('picks a photograph over a logo or screenshot', () => {
    const ranked = preferPhotoFirst(
      [
        'File:TikTok_logo.svg',
        'File:TikTok.com_Screenshot.png',
        'File:TikTok_Headquarters.jpg',
      ],
      'TikTok',
    );
    expect(ranked[0]).toBe('File:TikTok_Headquarters.jpg');
  });

  it('prefers a file whose name starts with the article', () => {
    const ranked = preferPhotoFirst(
      [
        'File:Google_ATV_Reference_RCU_G10_-_Netflix_button.jpg',
        'File:Netflix_at_Thong_Lor.jpg',
        'File:E3_Expo_2012_-_Playstation_banner_(7640591044).jpg',
        'File:PlayStation-SCPH-1000-with-Controller.jpg',
        'File:DualShock_2.jpg',
      ],
      'Netflix',
    );
    expect(ranked[0]).toBe('File:Netflix_at_Thong_Lor.jpg');

    const ps = preferPhotoFirst(
      [
        'File:E3_Expo_2012_-_Playstation_banner_(7640591044).jpg',
        'File:PlayStation-SCPH-1000-with-Controller.jpg',
        'File:DualShock_2.jpg',
      ],
      'PlayStation',
    );
    expect(ps[0]).toBe('File:PlayStation-SCPH-1000-with-Controller.jpg');
  });
});

describe('selectFallbackCandidates', () => {
  it('drops wiki chrome and the already-tried lead', () => {
    const candidates = selectFallbackCandidates(
      [
        'File:Gnome-mime-sound-openclipart.svg',
        'File:Netflix_UI_for_Web.png',
        'File:Netflix_at_Thong_Lor.jpg',
        'File:Netflix_2015_logo.svg',
      ],
      'Netflix',
      new Set(['File:Netflix_UI_for_Web.png']),
    );
    expect(candidates[0]).toBe('File:Netflix_at_Thong_Lor.jpg');
    expect(candidates).not.toContain('File:Gnome-mime-sound-openclipart.svg');
    expect(candidates).not.toContain('File:Netflix_UI_for_Web.png');
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
