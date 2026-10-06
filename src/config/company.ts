/** Fixed company data printed on every PDF. Editing it from the app is Phase 2 (SPEC §3). */
export const COMPANY = {
  name: "Sosa's Constructions",
  owner: 'Danilo Sosa',
  addressLine1: '29 E Providence Rd',
  addressLine2: 'Lansdowne, PA 19050',
  phones: ['435-512-4801', '208-600-7776'],
  tagline: 'Hardwood floors · Lansdowne, PA',
} as const;

/** Brand colors shared by the app and the PDF (tokens from the Claude Design handoff). */
export const COLORS = {
  walnut900: '#2A1A10',
  walnut700: '#3A2416',
  walnut500: '#6B4226',
  oak300: '#E8C58F',
  oak500: '#D9A866',
  gold500: '#C9962E',
  orange100: '#FCEBDF',
  orange400: '#EE7A30',
  orange500: '#E06A1F',
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
