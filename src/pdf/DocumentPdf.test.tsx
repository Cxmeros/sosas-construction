import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';
import { DocumentPdf, registerFonts } from './DocumentPdf';
import {
  INVOICE_WITH_EXTRAS,
  LONG_ESTIMATE,
  OPTIONS_ESTIMATE,
  SAMPLE_ESTIMATE,
  SAMPLE_INVOICE,
} from './fixtures';
import { buildPdfModel } from './model';
import type { DocumentData } from '../domain/types';

const assets = resolve(import.meta.dirname, '../assets');
const font = (name: string) => join(assets, 'fonts', name);
registerFonts({
  barlow: [400, 500, 600, 700].map((w) => ({
    src: font(`barlow-latin-${String(w)}-normal.woff`),
    fontWeight: w,
  })),
  condensed: [600, 700].map((w) => ({
    src: font(`barlow-condensed-latin-${String(w)}-normal.woff`),
    fontWeight: w,
  })),
});
const logo = join(assets, 'logo-placeholder.png');
const out = mkdtempSync(join(tmpdir(), 'sosa-pdf-'));

/** Renders the PDF and extracts its text with poppler's pdftotext (real, selectable text). */
async function renderText(
  doc: DocumentData,
  name: string,
): Promise<{ text: string; pages: number }> {
  const buffer = await renderToBuffer(<DocumentPdf model={buildPdfModel(doc)} logoSrc={logo} />);
  const file = join(out, `${name}.pdf`);
  writeFileSync(file, buffer);
  const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
  const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1]);
  expect(info).toMatch(/Page size:\s+612 x 792 pts \(letter\)/);
  // Letter-spaced labels come out as "CUSTO MER", so compare without whitespace.
  return { text: text.replace(/\s+/g, ''), pages };
}

describe('DocumentPdf', () => {
  it('renders the SPEC §6 estimate with total, deposit and balance', async () => {
    const { text, pages } = await renderText(SAMPLE_ESTIMATE, 'estimate');
    expect(pages).toBe(1);
    for (const s of [
      'WORK ESTIMATE',
      'EST-20261005-01',
      '10/05/2026',
      'CUSTOMER INFORMATION',
      'Margaret Kelly',
      'JOB DESCRIPTION',
      'Danilo Sosa & Carlos Sosa',
      '29 E Providence Rd',
      'Lansdowne, PA 19050',
      '435-512-4801',
      '208-600-7776',
      '$18,356.75',
      'Deposit required (30%)',
      '$5,507.03',
      'Balance due upon completion',
      '$12,849.72',
      'This is an estimate, not a quote or contract.',
      'Page 1 of 1',
    ]) {
      expect(text).toContain(s.replace(/\s+/g, ''));
    }
    expect(text).not.toMatch(/COSTUMER|TAX/);
  });

  it('renders the invoice with estimate reference and deposit received', async () => {
    const { text } = await renderText(SAMPLE_INVOICE, 'invoice');
    for (const s of [
      'INVOICE',
      'INV-20261005-01',
      'ESTIMATE REF.',
      'Deposit received (30%)',
      'Balance due',
      'Payment is due upon receipt.',
    ]) {
      expect(text).toContain(s.replace(/\s+/g, ''));
    }
    // Simplified table: description and amount, no quantity, unit or unit price.
    expect(text).not.toContain('UNITPRICE');
    expect(text).not.toContain('QTY');
    expect(text).not.toContain('1,625');
    expect(text).not.toContain('$0.85');
    expect(text).toContain('Installandrefinish$12,187.50');
  });

  it('prints invoice extra charges and adds them to the total', async () => {
    const { text } = await renderText(INVOICE_WITH_EXTRAS, 'invoice-extras');
    for (const s of [
      'ADDITIONAL CHARGES',
      'Debris disposal',
      '$50.00',
      'Extra trip for materials',
      '$125.00',
      '$18,531.75',
      '$12,972.22',
    ]) {
      expect(text).toContain(s.replace(/\s+/g, ''));
    }
  });

  it('paginates the long estimate with the table header repeated', async () => {
    const { text, pages } = await renderText(LONG_ESTIMATE, 'long');
    expect(pages).toBe(2);
    expect(text).toContain('Page1of2');
    expect(text).toContain('Page2of2');
    expect(text).toContain('Continuedonpage2');
    expect(text).toContain('(continued)');
    expect(text.match(/UNITPRICE/g)).toHaveLength(2);
  });

  it('renders two options side by side, each with title, description and totals', async () => {
    const { text, pages } = await renderText(OPTIONS_ESTIMATE, 'options');
    expect(pages).toBe(1);
    for (const s of [
      'OPTION 1',
      'Refinish existing hardwood floors',
      'Sand and refinish the existing hardwood floors',
      'Option 1 total',
      '$4,200.00',
      '$2,940.00',
      'OPTION 2',
      'Install new hardwood flooring',
      'Option 2 total',
      '$5,465.00',
      '$3,825.50',
      'TERMS AND CONDITIONS',
      'Page 1 of 1',
    ]) {
      expect(text).toContain(s.replace(/\s+/g, ''));
    }
    // Side by side: each card has a Description | Amount table.
    expect(text).not.toContain('UNITPRICE');
    expect(text.match(/AMOUNT/g)).toHaveLength(2);
  });
});
