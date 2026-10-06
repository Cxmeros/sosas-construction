import { countLines } from './measure';
import type { PdfModel, PdfRow } from './model';

/**
 * Page geometry in CSS px at 96 dpi (Letter = 816 × 1056), straight from the Claude Design
 * template. The PDF renderer converts to points (× 0.75).
 */
export const PAGE = {
  width: 816,
  height: 1056,
  padTop: 48,
  padX: 56,
  contentWidth: 816 - 2 * 56,
  gap: 22,
  footerBottom: 30,
} as const;

/** Table columns: description takes the rest. */
export const COLS = { qty: 64, unit: 76, unitPrice: 88, amount: 104 } as const;
export const DESC_COL_WIDTH =
  PAGE.contentWidth - COLS.qty - COLS.unit - COLS.unitPrice - COLS.amount;

/** Font sizes (px) and line height. */
export const TYPE = {
  lineHeight: 1.4,
  title: 44,
  compactTitle: 24,
  label: 14,
  body: 13.5,
  meta: 13,
  customerName: 15,
  jobDescription: 14,
  tableHead: 11.5,
  note: 12.5,
  terms: 12.5,
  totalsTotal: 15,
  totalsRow: 14,
  balance: 26,
  footer: 11.5,
  company: 12,
} as const;

const lh = (size: number) => size * TYPE.lineHeight;

/** Content must end above the footer. */
const CONTENT_BOTTOM = PAGE.height - PAGE.footerBottom - 26 - 18;

const FULL_HEADER = 92 + 14 + 3;
const COMPACT_HEADER = 48 + 10 + 3;
const SECTION_LABEL = lh(TYPE.label) + 4 + 1 + 6;
const TABLE_LABEL = lh(TYPE.label) + 6;
const TABLE_HEAD = 2 + 14 + lh(TYPE.tableHead) + 1;
const CONTINUED = 8 + lh(TYPE.note);

export function customerHeight(model: PdfModel): number {
  const width = PAGE.contentWidth - 28 - 3;
  let h = 24 + 3 + lh(TYPE.label) + 6 + lh(TYPE.customerName);
  if (model.customer.address)
    h += 6 + countLines(model.customer.address, width, TYPE.body) * lh(TYPE.body);
  if (model.customer.contact)
    h += 6 + countLines(model.customer.contact, width, TYPE.body) * lh(TYPE.body);
  return h;
}

export function rowHeight(row: PdfRow): number {
  const width = DESC_COL_WIDTH - 8;
  const main = Math.max(1, countLines(row.description, width, TYPE.body, true)) * lh(TYPE.body);
  const note = countLines(row.note, width, TYPE.note) * lh(TYPE.note);
  return 14 + main + note + 1;
}

function totalsAndTermsHeight(model: PdfModel): number {
  const totals =
    3 +
    (18 + lh(TYPE.totalsTotal)) +
    (model.deposit ? 1 + 18 + lh(TYPE.totalsRow) : 0) +
    (2 + 22 + 30);
  const termsLines = countLines(model.terms, PAGE.contentWidth, TYPE.terms);
  const terms = termsLines ? PAGE.gap + SECTION_LABEL + termsLines * lh(TYPE.terms) : 0;
  return PAGE.gap + totals + terms;
}

export interface PdfPage {
  pageNo: number;
  pageCount: number;
  /** Page 1 has the full header; the rest a compact one. */
  fullHeader: boolean;
  /** False only on a page that carries just the totals (the table ended on the previous page). */
  showTable: boolean;
  rows: PdfRow[];
  showTotals: boolean;
  /** Set on every page but the last: "Subtotal this page … Continued on page N". */
  continued: { subtotalCents: number; nextPage: number } | null;
}

/**
 * Splits the document into Letter pages. Rows are never split; the table header repeats on every
 * page; totals and terms stay together, moving whole to a new page when they don't fit.
 */
export function paginate(model: PdfModel): PdfPage[] {
  type Draft = { fullHeader: boolean; showTable: boolean; rows: PdfRow[] };
  const drafts: Draft[] = [];

  let y = PAGE.padTop + FULL_HEADER + PAGE.gap + customerHeight(model) + PAGE.gap;
  const descLines = countLines(model.jobDescription, PAGE.contentWidth, TYPE.jobDescription);
  if (descLines) y += SECTION_LABEL + descLines * lh(TYPE.jobDescription) + PAGE.gap;
  y += TABLE_LABEL + TABLE_HEAD;
  let page: Draft = { fullHeader: true, showTable: true, rows: [] };

  const startNewPage = (showTable: boolean) => {
    drafts.push(page);
    page = { fullHeader: false, showTable, rows: [] };
    y = PAGE.padTop + COMPACT_HEADER + PAGE.gap + (showTable ? TABLE_LABEL + TABLE_HEAD : 0);
  };

  for (const row of model.rows) {
    const h = rowHeight(row);
    // Always keep room for the "Continued on page N" line.
    if (page.rows.length > 0 && y + h + CONTINUED > CONTENT_BOTTOM) startNewPage(true);
    page.rows.push(row);
    y += h;
  }

  if (y + totalsAndTermsHeight(model) > CONTENT_BOTTOM) startNewPage(false);
  drafts.push(page);

  const pageCount = drafts.length;
  return drafts.map((d, i) => {
    const last = i === pageCount - 1;
    return {
      ...d,
      pageNo: i + 1,
      pageCount,
      showTotals: last,
      continued: last
        ? null
        : { subtotalCents: d.rows.reduce((sum, r) => sum + r.amountCents, 0), nextPage: i + 2 },
    };
  });
}
