import { countLines } from './measure';
import type { PdfModel, PdfRow } from './model';

/**
 * Page geometry in CSS px at 96 dpi (Letter = 816 × 1056), from the Claude Design v2 template
 * (design/project/Sosa PDF.dc.html). The PDF renderer converts to points (× 0.75).
 */
export const PAGE = {
  width: 816,
  height: 1056,
  padTop: 44,
  padX: 56,
  contentWidth: 816 - 2 * 56,
  gap: 14,
  /** Tighter rhythm on an invoice with additional charges. */
  gapWithExtras: 8,
  footerBottom: 28,
} as const;

/** Estimate table columns (description takes the rest); invoice: description + amount. */
export const COLS = { qty: 64, unit: 76, unitPrice: 88, amount: 104, simpleAmount: 120 } as const;

/** Font sizes (px) and line heights. */
export const TYPE = {
  lineHeight: 1.4,
  title: 44,
  compactTitle: 24,
  owners: 19,
  company: 12.5,
  label: 17,
  body: 13.5,
  meta: 13,
  customerName: 15,
  jobDescription: 14,
  tableHead: 11.5,
  note: 12.5,
  terms: 12.5,
  totalsTotal: 15,
  totalsRow: 14,
  balance: 28,
  footer: 11.5,
  processTitle: 30,
  stepNumber: 28,
  stepTitle: 15,
  /** Work process text reads looser. */
  processLineHeight: 1.5,
} as const;

export const LOGO_HEIGHT = { full: 104, compact: 56 } as const;

const lh = (size: number) => size * TYPE.lineHeight;
const plh = (size: number) => size * TYPE.processLineHeight;

const FOOTER_HEIGHT = 8 + lh(TYPE.footer) + 1;
/** Content must end above the footer. */
const CONTENT_BOTTOM = PAGE.height - PAGE.footerBottom - FOOTER_HEIGHT - 12;

const FULL_HEADER = LOGO_HEIGHT.full + 14 + 3;
const COMPACT_HEADER = LOGO_HEIGHT.compact + 10 + 3;
/** Section label with its thin rule underneath (JOB DESCRIPTION, TERMS). */
const RULED_LABEL = lh(TYPE.label) + 4 + 1;
const TABLE_LABEL = lh(TYPE.label) + 6;
const TABLE_HEAD = 2 + 14 + lh(TYPE.tableHead) + 1;
const CONTINUED = 8 + lh(TYPE.note);

/** Customer box: name/address on the left (1.3fr), phone/email on the right (1fr). */
export const CUSTOMER = { padY: 10, padX: 14, colGap: 24 } as const;
const CUSTOMER_INNER = PAGE.contentWidth - 2 * CUSTOMER.padX - 3 - CUSTOMER.colGap;
const CUSTOMER_LEFT = (CUSTOMER_INNER * 1.3) / 2.3;
const CUSTOMER_RIGHT = CUSTOMER_INNER - CUSTOMER_LEFT;

export function customerHeight(model: PdfModel): number {
  const c = model.customer;
  const lines = Math.max(
    countLines(c.address, CUSTOMER_LEFT, TYPE.body),
    countLines(c.email, CUSTOMER_RIGHT, TYPE.body),
  );
  return (
    2 * CUSTOMER.padY +
    3 +
    lh(TYPE.label) +
    2 +
    2 +
    lh(TYPE.customerName) +
    (lines ? 2 + lines * lh(TYPE.body) : 0)
  );
}

export const descWidth = (simple: boolean) =>
  simple
    ? PAGE.contentWidth - COLS.simpleAmount - 8
    : PAGE.contentWidth - COLS.qty - COLS.unit - COLS.unitPrice - COLS.amount - 8;

export function rowHeight(row: PdfRow, simple: boolean): number {
  const width = descWidth(simple);
  const main = Math.max(1, countLines(row.description, width, TYPE.body, true)) * lh(TYPE.body);
  const note = countLines(row.note, width, TYPE.note) * lh(TYPE.note);
  return (simple ? 16 : 14) + main + note + 1;
}

/** Dashed "ADDITIONAL CHARGES" box (invoice). */
export const EXTRAS = { padTop: 6, padBottom: 2, padX: 14 } as const;
function extrasHeight(model: PdfModel): number {
  if (!model.extras.length) return 0;
  const width = PAGE.contentWidth - 2 - 2 * EXTRAS.padX - COLS.simpleAmount - 8;
  const rows = model.extras.reduce(
    (sum, x) =>
      sum + 1 + 8 + Math.max(1, countLines(x.description, width, TYPE.body, true)) * lh(TYPE.body),
    0,
  );
  return 2 + EXTRAS.padTop + EXTRAS.padBottom + lh(TYPE.label) + 4 + rows;
}

function totalsHeight(model: PdfModel): number {
  return (
    3 +
    (model.subtotals ? 2 * (8 + lh(TYPE.body)) + 1 : 0) +
    (14 + lh(TYPE.totalsTotal) + (model.subtotals ? 2 : 0)) +
    (model.deposit ? 1 + 14 + lh(TYPE.totalsRow) : 0) +
    (20 + TYPE.balance)
  );
}

function termsHeight(model: PdfModel): number {
  const lines = countLines(model.terms, PAGE.contentWidth, TYPE.terms);
  return lines ? RULED_LABEL + 6 + lines * lh(TYPE.terms) : 0;
}

/** Work process step: number column + title and explanation. */
export const STEP = { numberCol: 44, colGap: 12, padY: 10, textWidth: 640 } as const;
function stepHeight(step: { title: string; body: string }): number {
  const width = Math.min(STEP.textWidth, PAGE.contentWidth - STEP.numberCol - STEP.colGap);
  const title = step.title
    ? countLines(step.title, width, TYPE.stepTitle, true) * TYPE.stepTitle * 1.25
    : 0;
  const body = countLines(step.body, width, TYPE.body) * plh(TYPE.body);
  const text = title + (title && body ? 3 : 0) + body;
  return 2 * STEP.padY + Math.max(TYPE.stepNumber, text) + 1;
}
function processIntroHeight(note: string): number {
  const lines = countLines(note, STEP.textWidth, TYPE.jobDescription);
  return 4 + TYPE.processTitle + (lines ? 6 + lines * plh(TYPE.jobDescription) : 0);
}

export interface DocPage {
  kind: 'document';
  pageNo: number;
  pageCount: number;
  /** Page 1 has the full header; the rest a compact one. */
  fullHeader: boolean;
  /** False only on a page that carries just the totals (the table ended on the previous page). */
  showTable: boolean;
  rows: PdfRow[];
  /** Extras, totals and terms always travel together, on the last document page. */
  showTotals: boolean;
  continued: { subtotalCents: number; nextPage: number } | null;
}

export interface ProcessPage {
  kind: 'process';
  pageNo: number;
  pageCount: number;
  /** The first process page carries the "WORK PROCESS" heading and the note. */
  first: boolean;
  steps: NonNullable<PdfModel['process']>['steps'];
}

export type PdfPage = DocPage | ProcessPage;

/**
 * Splits the document into Letter pages (design C). Rows are never split; extras, totals and
 * terms stay together and move whole to a new page when they don't fit. The work process starts
 * on a new page at the end and never splits a step.
 */
export function paginate(model: PdfModel): PdfPage[] {
  type Draft = Omit<DocPage, 'pageNo' | 'pageCount' | 'continued'>;
  const drafts: Draft[] = [];
  const gap = model.extras.length ? PAGE.gapWithExtras : PAGE.gap;

  let y = PAGE.padTop + FULL_HEADER + gap + customerHeight(model);
  const descLines = countLines(model.jobDescription, PAGE.contentWidth, TYPE.jobDescription);
  if (descLines || model.process)
    y +=
      gap +
      RULED_LABEL +
      5 +
      descLines * lh(TYPE.jobDescription) +
      (model.process ? 5 + lh(TYPE.body) : 0);
  y += gap + TABLE_LABEL + TABLE_HEAD;
  let page: Draft = {
    kind: 'document',
    fullHeader: true,
    showTable: true,
    rows: [],
    showTotals: false,
  };

  const startNewPage = (showTable: boolean) => {
    drafts.push(page);
    page = { kind: 'document', fullHeader: false, showTable, rows: [], showTotals: false };
    y = PAGE.padTop + COMPACT_HEADER + (showTable ? gap + TABLE_LABEL + TABLE_HEAD : 0);
  };

  for (const row of model.rows) {
    const h = rowHeight(row, model.simple);
    // Always keep room for the "Continued on page N" line.
    if (page.rows.length > 0 && y + h + CONTINUED > CONTENT_BOTTOM) startNewPage(true);
    page.rows.push(row);
    y += h;
  }

  const extras = extrasHeight(model);
  const closing =
    (extras ? gap + extras : 0) +
    gap +
    totalsHeight(model) +
    (termsHeight(model) ? gap + termsHeight(model) : 0);
  if (y + closing > CONTENT_BOTTOM) startNewPage(false);
  page.showTotals = true;
  drafts.push(page);

  // Work process: its own pages after the document.
  const processDrafts: Omit<ProcessPage, 'pageNo' | 'pageCount'>[] = [];
  if (model.process) {
    let current: Omit<ProcessPage, 'pageNo' | 'pageCount'> = {
      kind: 'process',
      first: true,
      steps: [],
    };
    let py = PAGE.padTop + COMPACT_HEADER + gap + processIntroHeight(model.process.note) + gap + 2;
    for (const step of model.process.steps) {
      const h = stepHeight(step);
      if (current.steps.length > 0 && py + h > CONTENT_BOTTOM) {
        processDrafts.push(current);
        current = { kind: 'process', first: false, steps: [] };
        py = PAGE.padTop + COMPACT_HEADER + gap + 2;
      }
      current.steps.push(step);
      py += h;
    }
    processDrafts.push(current);
  }

  const pageCount = drafts.length + processDrafts.length;
  const docPages: PdfPage[] = drafts.map((d, i) => {
    const last = i === drafts.length - 1;
    return {
      ...d,
      pageNo: i + 1,
      pageCount,
      continued: last
        ? null
        : { subtotalCents: d.rows.reduce((sum, r) => sum + r.amountCents, 0), nextPage: i + 2 },
    };
  });
  return [
    ...docPages,
    ...processDrafts.map((p, i) => ({ ...p, pageNo: drafts.length + i + 1, pageCount })),
  ];
}

/** Page where the work process starts ("Step-by-step work process on page N."), or null. */
export const processStartPage = (pages: PdfPage[]) =>
  pages.find((p) => p.kind === 'process')?.pageNo ?? null;
