import { describe, expect, it } from 'vitest';
import { formatCents, formatQty, parseMoneyToCents, parseQtyToHundredths } from './money';

describe('parseMoneyToCents', () => {
  it.each([
    ['0.85', 85],
    ['7.50', 750],
    ['7.5', 750],
    ['4', 400],
    ['3,000.00', 300000],
    ['$3,000', 300000],
    [' 12.34 ', 1234],
    ['.5', 50],
  ])('parses %s', (input, cents) => {
    expect(parseMoneyToCents(input)).toBe(cents);
  });

  it.each(['', 'abc', '1.234', '-5', '1e3', '1..2', '12,34.5.6'])('rejects %s', (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });
});

describe('parseQtyToHundredths', () => {
  it.each([
    ['1625', 162500],
    ['1,625', 162500],
    ['12.5', 1250],
    ['0.25', 25],
  ])('parses %s', (input, hundredths) => {
    expect(parseQtyToHundredths(input)).toBe(hundredths);
  });

  it.each(['', '1.255', '-1', 'x'])('rejects %s', (input) => {
    expect(parseQtyToHundredths(input)).toBeNull();
  });
});

describe('formatting', () => {
  it('formats cents as USD', () => {
    expect(formatCents(1835675)).toBe('$18,356.75');
    expect(formatCents(0)).toBe('$0.00');
  });
  it('formats quantities without trailing zeros', () => {
    expect(formatQty(162500)).toBe('1,625');
    expect(formatQty(1250)).toBe('12.5');
    expect(formatQty(25)).toBe('0.25');
  });
});
