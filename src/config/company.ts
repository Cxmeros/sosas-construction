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
 * arrives: replace the file (and these numbers if its size changes).
 */
export const LOGO = { src: logoUrl, file: 'logo-ai-red.jpg', width: 572, height: 762 } as const;

/** Brand tokens from the Claude Design v2 handoff, shared by the app and the PDF. */
export const COLORS = {
  walnut900: '#2A1A10',
  walnut700: '#3A2416',
  walnut500: '#6B4226',
  oak300: '#E8C58F',
  oak500: '#D9A866',
  gold500: '#C9962E',
  red100: '#F6E4E1',
  /** Header rule. */
  red500: '#9E1F1F',
  /** Titles and labels: 10:1 on white. */
  red700: '#7F1A1A',
  red800: '#5C1212',
  crimsonCta: '#A51C30',
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
