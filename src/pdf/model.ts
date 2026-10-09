import { COMPANY } from '../config/company';
import { documentTotals, lineAmountCents } from '../domain/calc';
import { formatPhone } from '../domain/form';
import { formatCents, formatQty } from '../domain/money';
import { documentFileName, formatDateUS } from '../domain/numbering';
import type { DocumentData } from '../domain/types';

export interface PdfRow {
  key: string;
  description: string;
  /** The optional detail line, printed below in gray. */
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
  customer: { name: string; address: string; phone: string; email: string };
  jobDescription: string;
  /** Invoice: Description | Amount only (design B). */
  simple: boolean;
  rows: PdfRow[];
  extras: { key: string; description: string; amount: string }[];
  /** "Work" and "Additional charges" rows, only when there are extras. */
  subtotals: { work: string; extras: string } | null;
  total: string;
  deposit: { label: string; value: string } | null;
  balanceLabel: string;
  balance: string;
  terms: string;
  /** Estimate work process, printed on its own pages at the end. */
  process: {
    note: string;
    steps: { key: string; nn: string; title: string; body: string }[];
  } | null;
  footer: { left: string; center: string };
  fileName: string;
}

/** " — " (also " – " or " -- ") in old descriptions: main line and gray note. */
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
  const totals = documentTotals(doc);

  const rows = doc.items.map((item): PdfRow => {
    const lump = item.unit === 'lump sum';
    const cents = lineAmountCents(item);
    const split = item.detail
      ? { description: item.description, note: item.detail }
      : splitDescription(item.description);
    return {
      key: item.id,
      ...split,
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
      phone: doc.customer.phone ? formatPhone(doc.customer.phone) : '',
      email: doc.customer.email,
    },
    jobDescription: doc.jobDescription,
    simple: invoice,
    rows,
    extras: doc.extras.map((x) => ({
      key: x.id,
      description: x.description,
      amount: formatCents(x.cents),
    })),
    subtotals: doc.extras.length
      ? { work: formatCents(totals.workCents), extras: formatCents(totals.extrasCents) }
      : null,
    total: formatCents(totals.totalCents),
    deposit,
    balanceLabel: invoice ? 'Balance due' : 'Balance due upon completion',
    balance: formatCents(totals.balanceCents),
    terms: doc.terms,
    process: doc.process && {
      note: doc.process.note,
      steps: doc.process.steps.map((s, i) => ({
        key: s.id,
        nn: String(i + 1).padStart(2, '0'),
        title: s.title,
        body: s.body,
      })),
    },
    footer: { left: `${COMPANY.name} · ${COMPANY.phones.join(' · ')}`, center: doc.number },
    fileName: documentFileName(doc.number, doc.customer.name),
  };
}
