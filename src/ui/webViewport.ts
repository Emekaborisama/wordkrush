import { brand } from './theme';

/** React Native Web maps a View's `nativeID` to this DOM id. */
export const WORDFALL_BOARD_WEB_ID = 'wk-wordfall-board';

/**
 * Visible-viewport fill for the web export. `100vh` includes the collapsed
 * mobile URL bar, so the hub clips under browser chrome; `100dvh` tracks the
 * visible area. Ink matches `theme.bg` so a letterboxed desktop frame does
 * not flash white.
 */
export const WEB_VIEWPORT_CSS = [
  `html,body{height:100%;height:100dvh;margin:0;background-color:${brand.ink};overflow:hidden}`,
  'body>div{height:100%}',
  '#wk-mascot canvas,#wk-mascot svg{max-width:100%!important;max-height:100%!important}',
  // A desktop mouse and iPad trackpad otherwise start the browser's text
  // selection over a tile before the RN responder can trace it. Limit this to
  // the board; copy/select behavior elsewhere in the app remains normal.
  `#${WORDFALL_BOARD_WEB_ID},#${WORDFALL_BOARD_WEB_ID} *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}`,
  `#${WORDFALL_BOARD_WEB_ID}{touch-action:none!important}`,
].join('');

export function ensureWebViewport(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('wk-web-viewport');
  if (existing) {
    // `patch-web-head.mjs` installs the initial production rule before React
    // runs. Refresh it here too, so the runtime and static export cannot drift.
    if (existing.textContent !== WEB_VIEWPORT_CSS) existing.textContent = WEB_VIEWPORT_CSS;
    return;
  }
  const style = document.createElement('style');
  style.id = 'wk-web-viewport';
  style.textContent = WEB_VIEWPORT_CSS;
  document.head.appendChild(style);
}
