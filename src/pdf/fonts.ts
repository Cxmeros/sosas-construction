import barlow400 from '../assets/fonts/barlow-latin-400-normal.woff';
import barlow500 from '../assets/fonts/barlow-latin-500-normal.woff';
import barlow600 from '../assets/fonts/barlow-latin-600-normal.woff';
import barlow700 from '../assets/fonts/barlow-latin-700-normal.woff';
import cond600 from '../assets/fonts/barlow-condensed-latin-600-normal.woff';
import cond700 from '../assets/fonts/barlow-condensed-latin-700-normal.woff';

/** Bundled font files (SIL OFL), embedded in every PDF. */
export const FONT_FILES = {
  barlow: [
    { src: barlow400, fontWeight: 400 },
    { src: barlow500, fontWeight: 500 },
    { src: barlow600, fontWeight: 600 },
    { src: barlow700, fontWeight: 700 },
  ],
  condensed: [
    { src: cond600, fontWeight: 600 },
    { src: cond700, fontWeight: 700 },
  ],
} as const;
