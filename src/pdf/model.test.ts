import { describe, expect, it } from 'vitest';
import { LONG_ESTIMATE, SAMPLE_ESTIMATE, SAMPLE_INVOICE } from './fixtures';
import { buildPdfModel } from './model';
import { paginate, processStartPage, type DocPage, type PdfPage } from './layout';

const docPages = (pages: PdfPage[]) => pages.filter((p): p is DocPage => p.kind === 'document');
import { countLines } from './measure';

describe('buildPdfModel', () => {
  it('always prints the date chosen in the form (bug 0)', () => {
    expect(buildPdfModel({ ...SAMPLE_ESTIMATE, date: '2026-12-25' }).date).toBe('12/25/2026');
  });

  it('builds the sample estimate (SPEC §7)', () => {
    const m = buildPdfModel(SAMPLE_ESTIMATE);
    expect(m.title).toBe('WORK ESTIMATE');
    expect(m.date).toBe('10/05/2026');
    expect(m.total).toBe('$18,356.75');
    expect(m.deposit).toEqual({ label: 'Deposit required (30%)', value: '$5,507.03' });
    expect(m.balanceLabel).toBe('Balance due upon completion');
    expect(m.balance).toBe('$12,849.72');
    expect(m.estimateRef).toBe('');
    expect(m.fileName).toBe('EST-20261005-01-Kelly.pdf');
    expect(m.rows[0]).toMatchObject({
      qty: '1,625',
      unit: 'sq ft',
      unitPrice: '$0.85',
      amount: '$1,381.25',
    });
    expect(m.rows[3]).toMatchObject({
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
    expect(m.estimateRef).toBe('EST-20261005-01');
    expect(m.deposit).toEqual({ label: 'Deposit received (30%)', value: '−$5,507.03' });
    expect(m.balanceLabel).toBe('Balance due');
    expect(m.simple).toBe(true);
    expect(m.terms).toContain('Please make checks payable to');
  });

  it('omits the deposit row and labels fixed deposits without a percentage', () => {
    expect(buildPdfModel({ ...SAMPLE_ESTIMATE, deposit: { mode: 'none' } }).deposit).toBeNull();
    expect(
      buildPdfModel({ ...SAMPLE_ESTIMATE, deposit: { mode: 'fixed', cents: 100000 } }).deposit,
    ).toEqual({
      label: 'Deposit required',
      value: '$1,000.00',
    });
  });

  it('prints the free-text unit for "other"', () => {
    const doc = {
      ...SAMPLE_ESTIMATE,
      items: [{ ...SAMPLE_ESTIMATE.items[0]!, unit: 'other' as const, otherUnit: 'rooms' }],
    };
    expect(buildPdfModel(doc).rows[0]?.unit).toBe('rooms');
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
      showTotals: true,
      continued: null,
    });
  });

  it('splits the long estimate, repeating the table and carrying totals to the last page', () => {
    const model = buildPdfModel(LONG_ESTIMATE);
    const pages = paginate(model);
    expect(pages).toHaveLength(2);
    const [first, second] = docPages(pages) as [DocPage, DocPage];
    expect(first.fullHeader).toBe(true);
    expect(first.showTotals).toBe(false);
    expect(first.continued?.nextPage).toBe(2);
    expect(first.continued?.subtotalCents).toBe(first.rows.reduce((s, r) => s + r.amountCents, 0));
    expect(second.fullHeader).toBe(false);
    expect(second.showTable).toBe(true);
    expect(second.showTotals).toBe(true);
    expect(first.rows.length + second.rows.length).toBe(18);
  });

  it('handles the maximum: 30 long rows, long description and terms', () => {
    const long =
      'Install and refinish hardwood floor in living room, dining room and hallway — ' +
      'x'.repeat(60);
    const items = Array.from({ length: 30 }, (_, i) => ({
      ...SAMPLE_ESTIMATE.items[0]!,
      id: String(i),
      description: long.slice(0, 200),
    }));
    const doc = {
      ...SAMPLE_ESTIMATE,
      items,
      jobDescription: 'word '.repeat(300),
      terms: 'term '.repeat(200),
    };
    const pages = paginate(buildPdfModel(doc));
    expect(docPages(pages).flatMap((p) => p.rows)).toHaveLength(30);
    expect(docPages(pages).at(-1)?.showTotals).toBe(true);
    pages.forEach((p, i) => {
      expect(p.pageNo).toBe(i + 1);
      expect(p.pageCount).toBe(pages.length);
    });
  });

  it('renders an empty table on one page when there are no rows', () => {
    const pages = paginate(buildPdfModel({ ...SAMPLE_ESTIMATE, items: [] }));
    expect(pages).toHaveLength(1);
    expect(docPages(pages)[0]?.rows).toEqual([]);
  });
});

describe('invoice extras and work process', () => {
  it('invoice with extras: Work / Additional charges subtotals', () => {
    const m = buildPdfModel({
      ...SAMPLE_INVOICE,
      extras: [{ id: 'x', description: 'Debris disposal', cents: 24000 }],
    });
    expect(m.subtotals).toEqual({ work: '$18,356.75', extras: '$240.00' });
    expect(m.total).toBe('$18,596.75');
    expect(m.balance).toBe('$13,089.72');
  });

  it('work process starts on a new page at the end and the note names that page', () => {
    const steps = Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      title: `Step ${String(i + 1)}`,
      body: 'Sand the floor in three passes and apply two coats of finish. '.repeat(5),
    }));
    const pages = paginate(
      buildPdfModel({ ...SAMPLE_ESTIMATE, process: { note: 'Plan for your home.', steps } }),
    );
    expect(pages[0]?.kind).toBe('document');
    expect(processStartPage(pages)).toBe(2);
    const process = pages.filter((p) => p.kind === 'process');
    expect(process.flatMap((p) => p.steps).map((s) => s.nn)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
    ]);
    expect(process[0]?.first).toBe(true);
    pages.forEach((p) => {
      expect(p.pageCount).toBe(pages.length);
    });
  });

  it('no work process → no process pages and no note', () => {
    expect(processStartPage(paginate(buildPdfModel(SAMPLE_ESTIMATE)))).toBeNull();
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
