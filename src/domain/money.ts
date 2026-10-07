const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const qtyFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Accepts "1625", "1,625", "12.5", "$3,000.00". Commas must be thousands separators. */
const DECIMAL = /^(?:\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d{0,2}))?$/;

/** Parses a non-negative decimal with up to 2 places into an integer number of hundredths. */
function parseHundredths(raw: string): number | null {
  const value = raw.trim().replace(/^\$/, '').trim();
  if (value === '' || value === '.') return null;
  const match = DECIMAL.exec(value);
  if (!match) return null;
  const [whole = '', fraction = ''] = value.replace(/,/g, '').split('.');
  if (whole === '' && fraction === '') return null;
  const result = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

export function parseMoneyToCents(raw: string): number | null {
  return parseHundredths(raw);
}

export function parseQtyToHundredths(raw: string): number | null {
  return parseHundredths(raw);
}

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

export function formatQty(hundredths: number): string {
  return qtyFormat.format(hundredths / 100);
}
