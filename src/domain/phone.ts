/** The 10-digit US number in `raw`, without a leading country code 1; null when it isn't one. */
export function usPhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

/** "(610) 555-0142" for the PDF (SPEC §3.3); anything else is printed as typed. */
export function formatPhoneUS(raw: string): string {
  const d = usPhoneDigits(raw);
  return d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw.trim();
}
