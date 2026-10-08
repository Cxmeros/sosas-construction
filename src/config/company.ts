/** Fixed company data printed on every PDF. Editing it from the app is Phase 2 (SPEC §3). */
export const COMPANY = {
  name: "Sosa's Constructions",
  /** Printed together in the PDF header: "Danilo Sosa & Carlos Sosa". */
  owners: ['Danilo Sosa', 'Carlos Sosa'],
  addressLine1: '29 E Providence Rd',
  addressLine2: 'Lansdowne, PA 19050',
  /**
   * Both numbers from Danilo's original estimate (design/project/uploads/ESTIMADO SOSAS.docx.pdf),
   * which lists them together without saying whose each one is.
   */
  phones: ['435-512-4801', '208-600-7776'],
  tagline: 'Hardwood floors · Lansdowne, PA',
} as const;

export const OWNERS_LINE = COMPANY.owners.join(' & ');

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
  /**
   * Brand dark red (October meeting). PROVISIONAL until the client sends the exact color; every
   * shade is checked for AA contrast in colors.test.ts. Kept darker than `error` (#B3261E) so an
   * error never looks like a brand accent.
   */
  brand100: '#F8E7E7',
  /** PDF table grid and box outlines. */
  brand200: '#E3B9B9',
  brand300: '#F29186',
  brand400: '#E5625A',
  brand500: '#A3262E',
  /** PDF section bars and title, with white text. */
  brand600: '#8E1D24',
  brand700: '#7D1A20',
  brand800: '#5C1217',
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
