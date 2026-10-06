import { COMPANY } from '../config/company';
import { computeTotals, lineAmountCents } from '../domain/calc';
import { formatCents, formatQty } from '../domain/money';
import { documentFileName, formatDateUS } from '../domain/numbering';
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
}

export interface PdfModel {
  title: 'WORK ESTIMATE' | 'INVOICE';
  number: string;
  date: string;
  estimateRef: string;
  customer: { name: string; address: string; contact: string };
  jobDescription: string;
  rows: PdfRow[];
  total: string;
  deposit: { label: string; value: string } | null;
  balanceLabel: string;
  balance: string;
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

export function buildPdfModel(doc: DocumentData): PdfModel {
  const invoice = doc.type === 'invoice';
  const totals = computeTotals(doc.items, doc.deposit);

  const rows = doc.items.map((item): PdfRow => {
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
    };
  });

  let deposit: PdfModel['deposit'] = null;
  if (doc.deposit.mode !== 'none') {
    const pct =
      doc.deposit.mode === 'percent' ? ` (${formatQty(doc.deposit.percentHundredths)}%)` : '';
    deposit = {
      label: (invoice ? 'Deposit received' : 'Deposit required') + pct,
      value: (invoice && totals.depositCents > 0 ? '−' : '') + formatCents(totals.depositCents),
    };
  }

  return {
    title: invoice ? 'INVOICE' : 'WORK ESTIMATE',
    number: doc.number,
    date: formatDateUS(doc.date),
    estimateRef: invoice ? doc.estimateRef : '',
    customer: {
      name: doc.customer.name,
      address: doc.customer.address,
      contact: [doc.customer.phone, doc.customer.email].filter(Boolean).join(' · '),
    },
    jobDescription: doc.jobDescription,
    rows,
    total: formatCents(totals.totalCents),
    deposit,
    balanceLabel: invoice ? 'Balance due' : 'Balance due upon completion',
    balance: formatCents(totals.balanceCents),
    terms: doc.terms,
    footer: { left: `${COMPANY.name} · ${COMPANY.tagline}`, center: doc.number },
    fileName: documentFileName(doc.type, doc.number, doc.customer.name),
  };
}
