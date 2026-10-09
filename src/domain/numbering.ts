import type { DocType } from './types';

const PREFIX: Record<DocType, string> = { estimate: 'EST', invoice: 'INV' };

/** `EST-YYYYMMDD-NN` / `INV-YYYYMMDD-NN` (SPEC §5). */
export function formatDocNumber(type: DocType, isoDate: string, sequence: number): string {
  return `${counterKey(type, isoDate)}-${String(sequence).padStart(2, '0')}`;
}

export function counterKey(type: DocType, isoDate: string): string {
  return `${PREFIX[type]}-${isoDate.replace(/-/g, '')}`;
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
