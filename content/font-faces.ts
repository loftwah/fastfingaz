import geistSans from '../public/fonts/Geist-Variable.woff2?inline';
import geistMono from '../public/fonts/GeistMono-Variable.woff2?inline';
import geistPixel from '../public/fonts/GeistPixel-Square.woff2?inline';

/**
 * Data-URI fonts for the content script. ChatGPT's CSP allows `font-src data:`
 * but not `chrome-extension:`, so the HUD cannot load the bundled font files
 * by URL. Inlining is the only way to keep the real type inside the page.
 */
export const CONTENT_FONT_FACES = `
@font-face {
  font-family: 'Geist';
  src: url('${geistSans}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('${geistMono}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Pixel';
  src: url('${geistPixel}') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
`;
