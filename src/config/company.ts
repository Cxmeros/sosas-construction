import logoUrl from '../assets/logo.jpg';

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
 * The ONLY reference to the logo, for the app and the PDF. Official logo (Oct 2026), flattened on
 * white: it always sits on white (SPEC §7). Changing it means replacing the file.
 */
export const LOGO = { src: logoUrl, file: 'logo.jpg' } as const;

/** Brand tokens the PDF uses (design v2); the app reads the same values from styles.css. */
export const COLORS = {
  walnut700: '#27272A',
  /** Header rule. */
  red500: '#C1121F',
  /** Titles and labels: 13:1 on white. */
  red700: '#780000',
  /** A shade darker than the app's #E4E4E7 so table rules survive black-and-white printing. */
  line: '#D4D4D8',
  lineSoft: '#E4E4E7',
  fieldBorder: '#71717A',
  ink: '#18181B',
  inkMuted: '#52525B',
} as const;
