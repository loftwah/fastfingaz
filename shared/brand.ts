/**
 * Fastfingaz brand tokens.
 *
 * The world: a Teenage Engineering field instrument — anodised black, warm
 * paper, one signal orange. Vercel's Geist family supplies the type.
 */

export const BRAND = {
  ink: '#0b0b0a',
  paper: '#f2efe6',
  paperDeep: '#e8e3d7',
  orange: '#ff4d00',
  orangeDisplay: '#e84a00',
  orangeInk: '#b83600',
  mutedDark: '#9a9488',
  mutedPaper: '#6d675c',
  lineDark: '#2a2824',
  linePaper: '#d5cfc1',
  white: '#f7f5ef',
} as const;

export const FONT = {
  sans:
    "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  pixel: "'Geist Pixel', 'Geist Mono', ui-monospace, monospace",
} as const;

/** @font-face rules used by extension pages (absolute /fonts paths). */
export const FONT_FACE_CSS = `
@font-face {
  font-family: 'Geist';
  src: url('/fonts/Geist-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('/fonts/GeistMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Pixel';
  src: url('/fonts/GeistPixel-Square.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
`;

/** Four-character receipt serial derived from a session id. */
export function serialFromId(id: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
}

/**
 * The content script lives in the page, so its shadow root needs the font
 * files registered on the page's document. Extension pages use /fonts.css.
 */
export function ensureDocumentFonts(cssText: string): void {
  if (!cssText) return;
  const id = 'fastfingaz-fonts';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}
