import { describe, expect, it } from 'vitest';
import {
  counterDay,
  documentFileName,
  formatDateUS,
  formatDocNumber,
  parseDocNumber,
  toIsoDate,
} from './numbering';

describe('formatDocNumber', () => {
  it('formats EST-AAMMDD-NN / INV-AAMMDD-NN', () => {
    expect(formatDocNumber('EST', '261021', 1)).toBe('EST-261021-01');
    expect(formatDocNumber('INV', '261021', 12)).toBe('INV-261021-12');
  });
  it('keeps going past 99', () => {
    expect(formatDocNumber('EST', '261021', 100)).toBe('EST-261021-100');
  });
});

describe('parseDocNumber', () => {
  it('reads the counter format, case-insensitive', () => {
    expect(parseDocNumber('INV-261021-03')).toEqual({ prefix: 'INV', day: '261021', sequence: 3 });
    expect(parseDocNumber(' est-261021-100 ')).toEqual({
      prefix: 'EST',
      day: '261021',
      sequence: 100,
    });
  });
  it('rejects other formats and impossible dates', () => {
    for (const s of [
      'EST-20261021-01',
      'XYZ-261021-01',
      'EST-261321-01',
      'EST-261000-01',
      'EST-261021-00',
      '15',
    ])
      expect(parseDocNumber(s)).toBeNull();
  });
});

describe('counterDay', () => {
  it('uses Pennsylvania time, not UTC', () => {
    // 22 Oct 02:30 UTC is still 21 Oct, 10:30 pm in Lansdowne (EDT, UTC−4).
    expect(counterDay(new Date('2026-10-22T02:30:00Z'))).toBe('261021');
    // Winter (EST, UTC−5).
    expect(counterDay(new Date('2027-01-01T04:59:00Z'))).toBe('261231');
    expect(counterDay(new Date('2027-01-01T05:00:00Z'))).toBe('270101');
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
  it('matches the SPEC example: number + last name', () => {
    expect(documentFileName('EST-20261005-01', 'Margaret Kelly')).toBe('EST-20261005-01-Kelly.pdf');
  });
  it('strips accents and unsafe characters', () => {
    expect(documentFileName('INV-1/2', "José O'Brien-Núñez")).toBe('INV-12-OBrien-Nunez.pdf');
  });
  it('omits an empty customer', () => {
    expect(documentFileName('EST-1', '  ')).toBe('EST-1.pdf');
  });
});
