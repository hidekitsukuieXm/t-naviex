/**
 * PDF Font Configuration
 * Japanese font support using Noto Sans JP
 */

import { Font } from '@react-pdf/renderer';

// Register Japanese font (Noto Sans JP from Google Fonts)
export function registerFonts() {
  Font.register({
    family: 'NotoSansJP',
    fonts: [
      {
        src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff',
        fontWeight: 'normal',
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-700-normal.woff',
        fontWeight: 'bold',
      },
    ],
  });
}
