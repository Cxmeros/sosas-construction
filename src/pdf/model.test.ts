import { describe, expect, it } from 'vitest';
import {
  ESTIMATE_WITH_STEPS,
  INVOICE_WITH_EXTRAS,
  LONG_ESTIMATE,
  OPTIONS_ESTIMATE,
  SAMPLE_ESTIMATE,
  SAMPLE_INVOICE,
} from './fixtures';
import { buildPdfModel, splitDescription } from './model';
import { paginate, type PdfPage } from './layout';
import { countLines } from './measure';
import type { DocumentData, LineItem } from '../domain/types';

const sampleItems = SAMPLE_ESTIMATE.options[0]!.items;
const withItems = (items: LineItem[], doc: DocumentData = SAMPLE_ESTIMATE): DocumentData => ({
  ...doc,
  options: [{ ...doc.options[0]!, items }],
});
const rowsOf = (pages: PdfPage[]) => pages.flatMap((p) => p.segments.flatMap((s) => s.rows));

describe('buildPdfModel', () => {
  it('builds the sample estimate (SPEC §7)', () => {
    const m = buildPdfModel(SAMPLE_ESTIMATE);
    expect(m.title).toBe('WORK ESTIMATE');
    expect(m.date).toBe('10/05/2026');
    expect(m.multi).toBe(false);
    expect(m.simpleTable).toBe(false);
    expect(m.estimateRef).toBe('');
    expect(m.fileName).toBe('Estimate_EST-20261005-01_Margaret-Kelly.pdf');
    const [option] = m.options;
    expect(option).toMatchObject({
      label: 'SERVICES AND MATERIALS',
      shortLabel: '',
      total: '$18,356.75',
      deposit: { label: 'Deposit required (30%)', value: '$5,507.03' },
      balanceLabel: 'Balance due upon completion',
      balance: '$12,849.72',
    });
    expect(option?.rows[0]).toMatchObject({
      qty: '1,625',
      unit: 'sq ft',
      unitPrice: '$0.85',
      amount: '$1,381.25',
    });
    expect(option?.rows[3]).toMatchObject({
      description: 'Refinish steps and handrails',
      note: '15 steps, 10 sticks',
      qty: '—',
      unit: 'lump sum',
      unitPrice: '—',
      amount: '$3,000.00',
    });
  });

  it('builds the invoice variant', () => {
    const m = buildPdfModel(SAMPLE_INVOICE);
    expect(m.title).toBe('INVOICE');
    // Invoices print only Description | Amount.
    expect(m.simpleTable).toBe(true);
    expect(m.estimateRef).toBe('EST-20261005-01');
    expect(m.options[0]?.deposit).toEqual({
      label: 'Deposit received (30%)',
      value: '−$5,507.03',
    });
    expect(m.options[0]?.balanceLabel).toBe('Balance due');
    expect(m.terms).toBe('Payment is due upon receipt. Thank you for your business.');
  });

  it('omits the deposit row and labels fixed deposits without a percentage', () => {
    expect(
      buildPdfModel({ ...SAMPLE_ESTIMATE, deposit: { mode: 'none' } }).options[0]?.deposit,
    ).toBeNull();
    expect(
      buildPdfModel({ ...SAMPLE_ESTIMATE, deposit: { mode: 'fixed', cents: 100000 } }).options[0]
        ?.deposit,
    ).toEqual({ label: 'Deposit required', value: '$1,000.00' });
  });

  it('prints the free-text unit for "other"', () => {
    const doc = withItems([{ ...sampleItems[0]!, unit: 'other', otherUnit: 'rooms' }]);
    expect(buildPdfModel(doc).options[0]?.rows[0]?.unit).toBe('rooms');
  });

  it('uses the option title as the section label when there is a single option', () => {
    const doc: DocumentData = {
      ...SAMPLE_ESTIMATE,
      options: [{ ...SAMPLE_ESTIMATE.options[0]!, title: 'Install new hardwood flooring' }],
    };
    expect(buildPdfModel(doc).options[0]?.label).toBe('INSTALL NEW HARDWOOD FLOORING');
  });

  it('labels and totals each option, with the deposit applied to each', () => {
    const m = buildPdfModel(OPTIONS_ESTIMATE);
    expect(m.multi).toBe(true);
    expect(m.options.map((o) => [o.label, o.shortLabel, o.total])).toEqual([
      ['OPTION 1 · REFINISH EXISTING HARDWOOD FLOORS', 'Option 1', '$4,200.00'],
      ['OPTION 2 · INSTALL NEW HARDWOOD FLOORING', 'Option 2', '$5,465.00'],
    ]);
    // 30 % of each option's own total.
    expect(m.options.map((o) => [o.deposit?.value, o.balance])).toEqual([
      ['$1,260.00', '$2,940.00'],
      ['$1,639.50', '$3,825.50'],
    ]);
  });
});

describe('invoice extra charges', () => {
  it('follow the items and count in the total, deposit and balance', () => {
    const m = buildPdfModel(INVOICE_WITH_EXTRAS);
    const rows = m.options[0]!.rows;
    expect(rows.map((r) => r.kind)).toEqual(['item', 'item', 'item', 'item', 'extra', 'extra']);
    expect(rows.slice(4).map((r) => [r.description, r.amount])).toEqual([
      ['Debris disposal', '$50.00'],
      ['Extra trip for materials', '$125.00'],
    ]);
    // $18,356.75 + $175 = $18,531.75; 30 % deposit received = $5,559.53.
    expect(m.options[0]).toMatchObject({ total: '$18,531.75', balance: '$12,972.22' });
  });

  it('get their head row again when they continue on another page', () => {
    const extras = Array.from({ length: 10 }, (_, i) => ({
      id: `x${String(i)}`,
      description: `Extra charge number ${String(i + 1)}`,
      amountCents: 1000,
    }));
    const doc = { ...LONG_ESTIMATE, type: 'invoice' as const, extras, estimateRef: '' };
    const pages = paginate(buildPdfModel(doc));
    expect(rowsOf(pages).filter((r) => r.kind === 'extra')).toHaveLength(10);
    expect(pages.at(-1)?.segments.at(-1)?.showTotals).toBe(true);
  });
});

describe('work-process steps', () => {
  it('print before the terms only when there are steps', () => {
    const pages = paginate(buildPdfModel(ESTIMATE_WITH_STEPS));
    const stepsPage = pages.findIndex((p) => p.showSteps);
    expect(pages.filter((p) => p.showSteps)).toHaveLength(1);
    expect(stepsPage).toBeGreaterThanOrEqual(0);
    expect(stepsPage).toBeLessThanOrEqual(pages.findIndex((p) => p.showTerms));
    expect(pages.at(-1)?.showTerms).toBe(true);
    expect(paginate(buildPdfModel(SAMPLE_ESTIMATE)).some((p) => p.showSteps)).toBe(false);
  });

  it('move whole to the next page when they do not fit', () => {
    const steps = Array.from(
      { length: 15 },
      (_, i) => `Step ${String(i + 1)} ${'word '.repeat(30)}`,
    );
    const pages = paginate(buildPdfModel({ ...LONG_ESTIMATE, steps }));
    expect(pages.filter((p) => p.showSteps)).toHaveLength(1);
    expect(pages.at(-1)?.showTerms).toBe(true);
  });
});

describe('splitDescription', () => {
  it.each([
    ['Refinish steps — 15 steps', 'Refinish steps', '15 steps'],
    ['Refinish steps – 15 steps', 'Refinish steps', '15 steps'],
    ['Refinish steps -- 15 steps', 'Refinish steps', '15 steps'],
    ['Water-based finish', 'Water-based finish', ''],
  ])('%s', (input, description, note) => {
    expect(splitDescription(input)).toEqual({ description, note });
  });
});

describe('paginate', () => {
  it('fits the sample estimate on one page', () => {
    const pages = paginate(buildPdfModel(SAMPLE_ESTIMATE));
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      pageNo: 1,
      pageCount: 1,
      fullHeader: true,
      showTerms: true,
      continued: null,
    });
    expect(pages[0]?.segments).toEqual([
      expect.objectContaining({ option: 0, header: 'full', showTable: true, showTotals: true }),
    ]);
  });

  it('fits the two-option estimate on one page, each option with its totals', () => {
    const pages = paginate(buildPdfModel(OPTIONS_ESTIMATE));
    expect(pages).toHaveLength(1);
    expect(
      pages[0]?.segments.map((s) => [s.option, s.header, s.rows.length, s.showTotals]),
    ).toEqual([
      [0, 'full', 2, true],
      [1, 'full', 3, true],
    ]);
  });

  it('splits the long estimate, repeating the table head and carrying totals to the last page', () => {
    const pages = paginate(buildPdfModel(LONG_ESTIMATE));
    expect(pages).toHaveLength(2);
    const [first, second] = pages as [PdfPage, PdfPage];
    expect(first.fullHeader).toBe(true);
    expect(first.segments.some((s) => s.showTotals)).toBe(false);
    expect(first.showTerms).toBe(false);
    expect(first.continued?.nextPage).toBe(2);
    expect(first.continued?.subtotalCents).toBe(
      rowsOf([first]).reduce((s, r) => s + r.amountCents, 0),
    );
    expect(second.fullHeader).toBe(false);
    expect(second.segments[0]).toMatchObject({ header: 'continued', showTable: true });
    expect(second.segments[0]?.showTotals).toBe(true);
    expect(second.showTerms).toBe(true);
    expect(rowsOf(pages)).toHaveLength(18);
  });

  it('never leaves an option bar without rows, and drops the subtotal with several options', () => {
    const big = LONG_ESTIMATE.options[0]!;
    const doc: DocumentData = {
      ...OPTIONS_ESTIMATE,
      options: [
        { ...big, id: 'a', title: 'Option A' },
        { ...big, id: 'b', title: 'Option B' },
        { ...big, id: 'c', title: 'Option C' },
      ],
    };
    const pages = paginate(buildPdfModel(doc));
    expect(pages.length).toBeGreaterThan(2);
    for (const page of pages) {
      for (const segment of page.segments) {
        if (segment.showTable) expect(segment.rows.length).toBeGreaterThan(0);
      }
      if (page.continued) expect(page.continued.subtotalCents).toBeNull();
    }
    // Every row of every option is printed exactly once, in order.
    expect(rowsOf(pages)).toHaveLength(54);
    // Each option's totals appear once, after its last row.
    expect(
      pages.flatMap((p) => p.segments.filter((s) => s.showTotals).map((s) => s.option)),
    ).toEqual([0, 1, 2]);
    expect(pages.at(-1)?.showTerms).toBe(true);
  });

  it('handles the maximum: 30 long rows, long description and terms', () => {
    const long =
      'Install and refinish hardwood floor in living room, dining room and hallway — ' +
      'x'.repeat(60);
    const items = Array.from({ length: 30 }, (_, i) => ({
      ...sampleItems[0]!,
      id: String(i),
      description: long.slice(0, 200),
    }));
    const doc = {
      ...withItems(items),
      jobDescription: 'word '.repeat(300),
      terms: 'term '.repeat(200),
    };
    const pages = paginate(buildPdfModel(doc));
    expect(rowsOf(pages)).toHaveLength(30);
    expect(pages.at(-1)?.showTerms).toBe(true);
    pages.forEach((p, i) => {
      expect(p.pageNo).toBe(i + 1);
      expect(p.pageCount).toBe(pages.length);
    });
  });

  it('renders an empty table on one page when there are no rows', () => {
    const pages = paginate(buildPdfModel(withItems([])));
    expect(pages).toHaveLength(1);
    expect(pages[0]?.segments[0]).toMatchObject({ showTable: true, rows: [], showTotals: true });
  });
});

describe('countLines', () => {
  it('wraps words and honors newlines', () => {
    expect(countLines('', 100, 14)).toBe(0);
    expect(countLines('short', 300, 14)).toBe(1);
    expect(countLines('a\nb', 300, 14)).toBe(2);
    expect(countLines('word '.repeat(100), 200, 14)).toBeGreaterThan(5);
    expect(countLines('x'.repeat(200), 100, 14)).toBeGreaterThan(5);
  });
});
