import logoUrl from '../assets/logo-ai-red.jpg';

/** Fixed company data printed on every PDF. Editing it from the app is Phase 2 (SPEC §3). */
export const COMPANY = {
  name: "Sosa's Constructions",
  /** Shown big in the PDF header, above the company name. */
  owners: 'Danilo & Carlos Sosa',
  address: '29 E Providence Rd, Lansdowne, PA 19050',
  phones: ['435-512-4801', '208-600-7776'],
  /** Who checks are made payable to. PENDING client confirmation (SPEC §2). */
  payee: "Sosa's Constructions",
} as const;

/**
 * The ONLY reference to the logo, for the app and the PDF. Provisional until the official logo
 * arrives: replace the file.
 */
export const LOGO = { src: logoUrl, file: 'logo-ai-red.jpg' } as const;

/** Brand tokens the PDF uses (design v2); the app reads the same values from styles.css. */
export const COLORS = {
  walnut700: '#3A2416',
  /** Header rule. */
  red500: '#9E1F1F',
  /** Titles and labels: 10:1 on white. */
  red700: '#7F1A1A',
  line: '#CDBBA7',
  lineSoft: '#D8CBBB',
  fieldBorder: '#7A6656',
  ink: '#1F1712',
  inkMuted: '#5C4A3D',
} as const;
