import { describe, expect, it } from 'vitest';
import { documentFileName, formatDateUS, formatDocNumber, toIsoDate } from './numbering';

describe('formatDocNumber', () => {
  it('formats estimates and invoices', () => {
    expect(formatDocNumber('estimate', '2026-10-05', 1)).toBe('EST-20261005-01');
    expect(formatDocNumber('invoice', '2026-10-05', 12)).toBe('INV-20261005-12');
  });
  it('keeps going past 99', () => {
    expect(formatDocNumber('estimate', '2026-10-05', 100)).toBe('EST-20261005-100');
  });
});

describe('dates', () => {
  it('formats MM-DD-YYYY', () => {
    expect(formatDateUS('2026-10-05')).toBe('10-05-2026');
  });
  it('builds a local ISO date', () => {
    expect(toIsoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('documentFileName', () => {
  it('matches the SPEC example', () => {
    expect(documentFileName('estimate', 'EST-20261005-01', 'John Smith')).toBe(
      'Estimate_EST-20261005-01_John-Smith.pdf',
    );
  });
  it('strips accents and unsafe characters', () => {
    expect(documentFileName('invoice', 'INV-1/2', "José O'Brien & Hijos")).toBe(
      'Invoice_INV-12_Jose-OBrien-Hijos.pdf',
    );
  });
  it('omits an empty customer', () => {
    expect(documentFileName('estimate', 'EST-1', '  ')).toBe('Estimate_EST-1.pdf');
  });
});
