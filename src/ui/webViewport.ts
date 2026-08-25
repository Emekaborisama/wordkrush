import { brand } from './theme';

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
].join('');

export function ensureWebViewport(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wk-web-viewport')) return;
  const style = document.createElement('style');
  style.id = 'wk-web-viewport';
  style.textContent = WEB_VIEWPORT_CSS;
  document.head.appendChild(style);
}
