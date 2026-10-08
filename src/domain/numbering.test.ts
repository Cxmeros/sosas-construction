import { describe, expect, it } from 'vitest';
import {
  documentFileName,
  formatDateUS,
  formatDocNumber,
  numberForDate,
  toIsoDate,
} from './numbering';

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
  it('formats MM/DD/YYYY', () => {
    expect(formatDateUS('2026-10-05')).toBe('10/05/2026');
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

describe('numberForDate', () => {
  it('moves an automatic number to the chosen date, keeping its sequence', () => {
    expect(numberForDate('EST-20261008-01', '2026-10-20')).toBe('EST-20261020-01');
    expect(numberForDate('INV-20261008-12', '2025-01-02')).toBe('INV-20250102-12');
  });
  it('leaves numbers Danilo typed himself alone', () => {
    expect(numberForDate('A-1043', '2026-10-20')).toBeNull();
    expect(numberForDate('EST-2026108-01', '2026-10-20')).toBeNull();
  });
  it('ignores an incomplete date', () => {
    expect(numberForDate('EST-20261008-01', '')).toBeNull();
  });
});
