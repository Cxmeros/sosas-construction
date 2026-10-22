import type { DocType } from './types';

export const PREFIX = { estimate: 'EST', invoice: 'INV' } as const satisfies Record<
  DocType,
  string
>;
export type Prefix = (typeof PREFIX)[DocType];

/** `EST-AAMMDD-NN` / `INV-AAMMDD-NN`, e.g. `EST-261021-01` (SPEC §5). Shared with the Worker. */
export function formatDocNumber(prefix: Prefix, day: string, sequence: number): string {
  return `${prefix}-${day}-${String(sequence).padStart(2, '0')}`;
}

const DOC_NUMBER = /^(EST|INV)-(\d{2})(\d{2})(\d{2})-(\d{2,4})$/;

/** A number in the counter's format, or null (hand-typed numbers may use any format). */
export function parseDocNumber(
  value: string,
): { prefix: Prefix; day: string; sequence: number } | null {
  const m = DOC_NUMBER.exec(value.trim().toUpperCase());
  if (!m) return null;
  const [, prefix, yy = '', mm = '', dd = '', seq = ''] = m;
  const month = Number(mm);
  const date = Number(dd);
  const sequence = Number(seq);
  if (month < 1 || month > 12 || date < 1 || date > 31 || sequence < 1) return null;
  return { prefix: prefix as Prefix, day: `${yy}${mm}${dd}`, sequence };
}

/** AAMMDD in Pennsylvania (America/New_York), not UTC: a 9 pm estimate keeps that day. */
export function counterDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

/** Local calendar date as yyyy-mm-dd (not UTC: a late-evening estimate keeps today's date). */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** yyyy-mm-dd → MM/DD/YYYY (the PDF date, SPEC §3.2). */
export function formatDateUS(isoDate: string): string {
  const [y = '', m = '', d = ''] = isoDate.split('-');
  return `${m}/${d}/${y}`;
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/** `EST-20261005-01-Kelly.pdf`: number + customer's last name, only `[A-Za-z0-9-]` (SPEC §7). */
export function documentFileName(number: string, customerName: string): string {
  const lastName = slug(customerName.trim().split(/\s+/).pop() ?? '');
  return `${[slug(number) || 'document', lastName].filter(Boolean).join('-')}.pdf`;
}
