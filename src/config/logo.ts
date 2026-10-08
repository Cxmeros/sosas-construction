import logoUrl from '../assets/logo-placeholder.png';

/**
 * The company logo, used by the app header and both PDF renderers. To replace it, follow
 * "Cambiar el logo" in the README: swap the file and update its pixel size here (a test checks
 * the size against the file). It must be a PNG or JPG: the PDF library can't draw SVG.
 */
export const LOGO = { src: logoUrl, width: 525, height: 245 } as const;

/** Width that keeps the logo's proportions at `height`. */
export const logoWidth = (height: number) => (height * LOGO.width) / LOGO.height;
