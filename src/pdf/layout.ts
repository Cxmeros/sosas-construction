import { countLines } from './measure';
import type { PdfModel, PdfOption, PdfRow } from './model';

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

/**
 * Section style from Danilo's original estimate: a solid orange bar with the label, then a pale
 * orange box with the content.
 */
export const BAR = { padY: 4, padX: 10 } as const;
export const BOX = { padY: 10, padX: 12, gap: 4 } as const;
/** Light grid around the items table; cell padding inside each column. */
export const CELL = { padY: 7, padX: 8 } as const;

const FULL_HEADER = 92 + 14 + 3;
const COMPACT_HEADER = 48 + 10 + 3;
const BAR_HEIGHT = lh(TYPE.label) + 2 * BAR.padY;
const BOX_TEXT_WIDTH = PAGE.contentWidth - 2 * BOX.padX;
/** Space between an option's bar (or description box) and its table. */
export const TABLE_GAP = 6;
const TABLE_HEAD = 1 + 2 * CELL.padY + lh(TYPE.tableHead) + 1;
/** "Continued on page N" line, its own block below the content. */
const CONTINUED = PAGE.gap + lh(TYPE.note);

/** Bar + box with `lines` lines of text at `size`. */
const sectionHeight = (lines: number, size: number) => BAR_HEIGHT + 2 * BOX.padY + lines * lh(size);

export function customerHeight(model: PdfModel): number {
  let h = BAR_HEIGHT + 2 * BOX.padY + lh(TYPE.customerName);
  if (model.customer.address)
    h += BOX.gap + countLines(model.customer.address, BOX_TEXT_WIDTH, TYPE.body) * lh(TYPE.body);
  if (model.customer.contact)
    h += BOX.gap + countLines(model.customer.contact, BOX_TEXT_WIDTH, TYPE.body) * lh(TYPE.body);
  return h;
}

/** Invoice table: Description | Amount. */
export const SIMPLE_DESC_COL_WIDTH = PAGE.contentWidth - COLS.amount;

export function rowHeight(row: PdfRow, simple = false): number {
  // Table side borders (2) and the description cell's own padding.
  const width = (simple ? SIMPLE_DESC_COL_WIDTH : DESC_COL_WIDTH) - 2 - 2 * CELL.padX;
  const main = Math.max(1, countLines(row.description, width, TYPE.body, true)) * lh(TYPE.body);
  const note = countLines(row.note, width, TYPE.note) * lh(TYPE.note);
  return 2 * CELL.padY + main + note + 1;
}

/** Bar with the option label, plus its description box when it has one (full header only). */
function optionHeaderHeight(option: PdfOption, continued: boolean): number {
  const lines = continued ? 0 : countLines(option.description, BOX_TEXT_WIDTH, TYPE.body);
  return BAR_HEIGHT + (lines ? 2 * BOX.padY + lines * lh(TYPE.body) : 0) + TABLE_GAP;
}

function totalsHeight(option: PdfOption): number {
  return (
    3 +
    (18 + lh(TYPE.totalsTotal)) +
    (option.deposit ? 1 + 18 + lh(TYPE.totalsRow) : 0) +
    (2 + 22 + 30)
  );
}

function termsHeight(model: PdfModel): number {
  const lines = countLines(model.terms, BOX_TEXT_WIDTH, TYPE.terms);
  return lines ? sectionHeight(lines, TYPE.terms) : 0;
}

/** Two-option layout: side-by-side cards, each with a Description | Amount table. */
export const COLUMNS = { gap: 16, amount: 96 } as const;
export const COLUMN_WIDTH = (PAGE.contentWidth - COLUMNS.gap) / 2;
const COLUMN_DESC_WIDTH = COLUMN_WIDTH - 2 - COLUMNS.amount - 2 * CELL.padX;
const COLUMN_TEXT_WIDTH = COLUMN_WIDTH - 2 * BOX.padX;

function columnRowHeight(row: PdfRow): number {
  const main =
    Math.max(1, countLines(row.description, COLUMN_DESC_WIDTH, TYPE.body, true)) * lh(TYPE.body);
  const note = countLines(row.note, COLUMN_DESC_WIDTH, TYPE.note) * lh(TYPE.note);
  const detail = row.detail ? lh(TYPE.note) : 0;
  return 2 * CELL.padY + main + note + detail + 1;
}

/** Height of one option card in the two-column layout. */
function cardHeight(option: PdfOption): number {
  const titleLines = countLines(option.title, COLUMN_TEXT_WIDTH, TYPE.customerName, true);
  const descLines = countLines(option.description, COLUMN_TEXT_WIDTH, TYPE.body);
  const box =
    titleLines || descLines
      ? 2 * BOX.padY +
        titleLines * lh(TYPE.customerName) +
        (titleLines && descLines ? BOX.gap : 0) +
        descLines * lh(TYPE.body)
      : 0;
  const rows = option.rows.reduce((sum, r) => sum + columnRowHeight(r), 0);
  return BAR_HEIGHT + box + TABLE_GAP + TABLE_HEAD + rows + PAGE.gap + totalsHeight(option);
}

/** What one option contributes to one page. */
export interface PdfSegment {
  option: number;
  /** "full" with description on the option's first page; "continued" on later pages. */
  header: 'full' | 'continued';
  /** Table head (and these rows). False on a page with only the option's totals. */
  showTable: boolean;
  rows: PdfRow[];
  showTotals: boolean;
}

export interface PdfPage {
  pageNo: number;
  pageCount: number;
  /** Page 1 has the full header; the rest a compact one. */
  fullHeader: boolean;
  /** Two options side by side as cards (segments[0] and segments[1], complete). */
  columns: boolean;
  segments: PdfSegment[];
  showTerms: boolean;
  /**
   * Set on every page but the last: "Continued on page N", with the subtotal of the page's rows
   * when the document has a single option (a subtotal across options would mean nothing).
   */
  continued: { subtotalCents: number | null; nextPage: number } | null;
}

/**
 * Splits the document into Letter pages. Rows are never split. Each option starts with its bar
 * kept together with the table head and first row; the table head repeats when an option continues
 * on a new page; an option's totals box moves whole. Terms come last.
 */
export function paginate(model: PdfModel): PdfPage[] {
  type Draft = Omit<PdfPage, 'pageNo' | 'pageCount' | 'continued'>;
  const drafts: Draft[] = [];

  let y = PAGE.padTop + FULL_HEADER + PAGE.gap + customerHeight(model);
  const descLines = countLines(model.jobDescription, BOX_TEXT_WIDTH, TYPE.jobDescription);
  if (descLines) y += PAGE.gap + sectionHeight(descLines, TYPE.jobDescription);
  let page: Draft = { fullHeader: true, columns: false, segments: [], showTerms: false };

  /** Room left, always keeping space for the "Continued on page N" line. */
  const fits = (h: number) => y + h + CONTINUED <= CONTENT_BOTTOM;
  const breakPage = () => {
    drafts.push(page);
    page = { fullHeader: false, columns: false, segments: [], showTerms: false };
    y = PAGE.padTop + COMPACT_HEADER;
  };
  const open = (option: number, header: PdfSegment['header'], showTable: boolean) => {
    const opt = model.options[option];
    if (!opt) throw new Error('option out of range');
    y += PAGE.gap + optionHeaderHeight(opt, header === 'continued') + (showTable ? TABLE_HEAD : 0);
    const segment: PdfSegment = { option, header, showTable, rows: [], showTotals: false };
    page.segments.push(segment);
    return segment;
  };

  const [a, b] = model.options;
  const sideBySide =
    model.options.length === 2 && a && b ? PAGE.gap + Math.max(cardHeight(a), cardHeight(b)) : null;
  // Two options go side by side, like a comparison, when both fit whole on the first page.
  if (sideBySide !== null && fits(sideBySide)) {
    page.columns = true;
    model.options.forEach((option, i) => {
      page.segments.push({
        option: i,
        header: 'full',
        showTable: true,
        rows: option.rows,
        showTotals: true,
      });
    });
    y += sideBySide;
  } else
    model.options.forEach((option, i) => {
      const first = option.rows[0];
      const start =
        PAGE.gap +
        optionHeaderHeight(option, false) +
        TABLE_HEAD +
        (first ? rowHeight(first, model.simpleTable) : PAGE.gap + totalsHeight(option));
      // Never leave an option's bar alone at the bottom of a page.
      if (!fits(start) && (page.segments.length > 0 || page.fullHeader)) breakPage();
      let current = open(i, 'full', true);

      /** The "ADDITIONAL CHARGES" head row, printed before the first extra on each page. */
      const extraHead = (segment: PdfSegment, row: PdfRow) =>
        row.kind === 'extra' && !segment.rows.some((r) => r.kind === 'extra') ? TABLE_HEAD : 0;

      for (const row of option.rows) {
        const h = rowHeight(row, model.simpleTable);
        if (current.rows.length > 0 && !fits(h + extraHead(current, row))) {
          breakPage();
          current = open(i, 'continued', true);
        }
        y += h + extraHead(current, row);
        current.rows.push(row);
      }

      const t = PAGE.gap + totalsHeight(option);
      if (!fits(t)) {
        breakPage();
        current = open(i, 'continued', false);
      }
      current.showTotals = true;
      y += t;
    });

  const terms = termsHeight(model);
  if (terms) {
    // The last page needs no "continued" line, so terms may use that space.
    if (y + PAGE.gap + terms > CONTENT_BOTTOM) breakPage();
    page.showTerms = true;
  }
  drafts.push(page);

  const pageCount = drafts.length;
  return drafts.map((d, i) => {
    const last = i === pageCount - 1;
    const rows = d.segments.flatMap((s) => s.rows);
    return {
      ...d,
      pageNo: i + 1,
      pageCount,
      continued: last
        ? null
        : {
            subtotalCents: model.multi ? null : rows.reduce((sum, r) => sum + r.amountCents, 0),
            nextPage: i + 2,
          },
    };
  });
}
