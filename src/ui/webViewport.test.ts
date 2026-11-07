import { describe, expect, it } from 'vitest';
import { WEB_VIEWPORT_CSS, WORDFALL_BOARD_WEB_ID } from './webViewport';

describe('WEB_VIEWPORT_CSS', () => {
  it('prevents browser selection and touch actions only within the Wordfall board', () => {
    expect(WEB_VIEWPORT_CSS).toContain(`#${WORDFALL_BOARD_WEB_ID}`);
    expect(WEB_VIEWPORT_CSS).toContain('user-select:none');
    expect(WEB_VIEWPORT_CSS).toContain('touch-action:none');
  });

  it('sizes only the app root, so empty modal hosts add no hidden scroll room', () => {
    expect(WEB_VIEWPORT_CSS).toContain('#root{height:100%}');
    expect(WEB_VIEWPORT_CSS).not.toContain('body>div');
  });
});
