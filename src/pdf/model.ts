import { COMPANY } from '../config/company';
import { computeTotals, lineAmountCents } from '../domain/calc';
import { formatCents, formatQty } from '../domain/money';
import { documentFileName, formatDateUS } from '../domain/numbering';
import { formatPhoneUS } from '../domain/phone';
import type { DocumentData } from '../domain/types';

export interface PdfRow {
  key: string;
  description: string;
  /** Text after " — " in the description, printed below in gray. */
  note: string;
  qty: string;
  unit: string;
  unitPrice: string;
  amount: string;
  amountCents: number;
  /** "1,625 sq ft × $7.50" (empty for lump sum): the detail line in the two-column layout. */
  detail: string;
  /** An invoice extra charge (SPEC §3.7c), printed under "ADDITIONAL CHARGES". */
  kind: 'item' | 'extra';
}

export interface PdfOption {
  key: string;
  /** Bar text: "OPTION 1 · INSTALL NEW FLOORING" with several options; the title or
   *  "SERVICES AND MATERIALS" with one. */
  label: string;
  /** Short form for continued pages and the totals box ("Option 1"), or '' with one option. */
  shortLabel: string;
  /** As typed; shown under the bar in the two-column layout. */
  title: string;
  description: string;
  rows: PdfRow[];
  total: string;
  totalCents: number;
  deposit: { label: string; value: string } | null;
  balanceLabel: string;
  balance: string;
}

export interface PdfModel {
  title: 'WORK ESTIMATE' | 'INVOICE';
  number: string;
  date: string;
  estimateRef: string;
  customer: { name: string; address: string; contact: string };
  jobDescription: string;
  /** True when the estimate offers 2+ options to choose from. */
  multi: boolean;
  /** Invoice: items show only Description | Amount (no qty, unit or unit price). */
  simpleTable: boolean;
  options: PdfOption[];
  /** Estimate work-process steps, printed as a numbered list (empty: no section). */
  steps: string[];
  terms: string;
  footer: { left: string; center: string };
  fileName: string;
}

/** " — " (also " – " or " -- ", easier to type on a phone) splits main line and gray note. */
const NOTE_SEPARATOR = /\s+(?:—|–|--)\s+/;

export function splitDescription(description: string): { description: string; note: string } {
  const match = NOTE_SEPARATOR.exec(description);
  if (!match) return { description, note: '' };
  return {
    description: description.slice(0, match.index).trim(),
    note: description.slice(match.index + match[0].length).trim(),
  };
}

function buildRows(items: DocumentData['options'][number]['items']): PdfRow[] {
  return items.map((item): PdfRow => {
    const lump = item.unit === 'lump sum';
    const cents = lineAmountCents(item);
    return {
      key: item.id,
      ...splitDescription(item.description),
      qty: lump ? '—' : formatQty(item.qtyHundredths),
      unit: item.unit === 'other' ? item.otherUnit || 'other' : item.unit,
      unitPrice: lump ? '—' : formatCents(item.unitPriceCents),
      amount: formatCents(cents),
      amountCents: cents,
      detail: lump
        ? ''
        : `${formatQty(item.qtyHundredths)} ${item.unit === 'other' ? item.otherUnit || 'other' : item.unit} × ${formatCents(item.unitPriceCents)}`,
      kind: 'item',
    };
  });
}

export function buildPdfModel(doc: DocumentData): PdfModel {
  const invoice = doc.type === 'invoice';
  const multi = doc.options.length > 1;

  const extraRows = doc.extras.map((extra): PdfRow => ({
    key: extra.id,
    ...splitDescription(extra.description),
    qty: '',
    unit: '',
    unitPrice: '',
    amount: formatCents(extra.amountCents),
    amountCents: extra.amountCents,
    detail: '',
    kind: 'extra',
  }));
  const last = doc.options.length - 1;

  const options = doc.options.map((option, i): PdfOption => {
    const totals = computeTotals(option.items, doc.deposit, doc.extras);
    let deposit: PdfOption['deposit'] = null;
    if (doc.deposit.mode !== 'none') {
      const pct =
        doc.deposit.mode === 'percent' ? ` (${formatQty(doc.deposit.percentHundredths)}%)` : '';
      deposit = {
        label: (invoice ? 'Deposit received' : 'Deposit required') + pct,
        value: (invoice && totals.depositCents > 0 ? '−' : '') + formatCents(totals.depositCents),
      };
    }
    const title = option.title.toUpperCase();
    const shortLabel = multi ? `Option ${String(i + 1)}` : '';
    return {
      key: option.id,
      label: multi
        ? `OPTION ${String(i + 1)}${title ? ` · ${title}` : ''}`
        : title || 'SERVICES AND MATERIALS',
      shortLabel,
      title: option.title,
      description: option.description,
      // Extras exist only on invoices (one option): they follow its items.
      rows: i === last ? [...buildRows(option.items), ...extraRows] : buildRows(option.items),
      total: formatCents(totals.totalCents),
      totalCents: totals.totalCents,
      deposit,
      balanceLabel: invoice ? 'Balance due' : 'Balance due upon completion',
      balance: formatCents(totals.balanceCents),
    };
  });

  return {
    title: invoice ? 'INVOICE' : 'WORK ESTIMATE',
    number: doc.number,
    date: formatDateUS(doc.date),
    estimateRef: invoice ? doc.estimateRef : '',
    customer: {
      name: doc.customer.name,
      address: doc.customer.address,
      contact: [formatPhoneUS(doc.customer.phone), doc.customer.email].filter(Boolean).join(' · '),
    },
    jobDescription: doc.jobDescription,
    multi,
    simpleTable: invoice,
    options,
    steps: doc.steps,
    terms: doc.terms,
    footer: { left: `${COMPANY.name} · ${COMPANY.tagline}`, center: doc.number },
    fileName: documentFileName(doc.type, doc.number, doc.customer.name),
  };
}
