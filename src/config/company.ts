/** Fixed company data printed on every PDF. Editing it from the app is Phase 2 (SPEC §3). */
export const COMPANY = {
  name: "Sosa's Constructions",
  owner: 'Danilo Sosa',
  addressLine1: '29 E Providence Rd',
  addressLine2: 'Lansdowne, PA 19050',
  phones: ['435-512-4801', '208-600-7776'],
  tagline: 'Hardwood floors · Lansdowne, PA',
} as const;

/**
 * Feature switches. `estimateOptions` (1–3 options per estimate, SPEC §3.11) is built and tested
 * but turned off: after the October meeting the client chose the simple version.
 */
export const FEATURES: { readonly estimateOptions: boolean } = {
  estimateOptions: false,
};

/** Brand colors shared by the app and the PDF (tokens from the Claude Design handoff). */
export const COLORS = {
  walnut900: '#2A1A10',
  walnut700: '#3A2416',
  walnut500: '#6B4226',
  oak300: '#E8C58F',
  oak500: '#D9A866',
  gold500: '#C9962E',
  orange100: '#FCEBDF',
  /** PDF table grid and box outlines (light orange, as in Danilo's original estimate). */
  orange200: '#F2C4A2',
  orange400: '#EE7A30',
  orange500: '#E06A1F',
  /** PDF section bars: the brightest orange that keeps white text at AA (4.56:1). */
  orange600: '#C2551A',
  orange700: '#B5470F',
  orange800: '#8F3709',
  paper: '#F6F1EA',
  surface: '#FFFFFF',
  line: '#CDBBA7',
  lineSoft: '#D8CBBB',
  fieldBorder: '#7A6656',
  ink: '#1F1712',
  inkMuted: '#5C4A3D',
  error: '#B3261E',
  errorBg: '#FBE9E7',
  success: '#2F6B3A',
} as const;
