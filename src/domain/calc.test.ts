import { describe, expect, it } from 'vitest';
import { computeTotals, depositCents, lineAmountCents, optionTotals } from './calc';
import type { LineItem } from './types';

const item = (patch: Partial<LineItem>): LineItem => ({
  id: 'x',
  description: 'x',
  unit: 'sq ft',
  otherUnit: '',
  qtyHundredths: 0,
  unitPriceCents: 0,
  lumpSumCents: 0,
  ...patch,
});

// The real sample estimate (SPEC §6).
const SAMPLE: LineItem[] = [
  item({
    description: 'Remove carpet and hardwood floor',
    qtyHundredths: 162500,
    unitPriceCents: 85,
  }),
  item({ description: 'Install and refinish', qtyHundredths: 162500, unitPriceCents: 750 }),
  item({
    description: 'Refinish scraper hardwood floors',
    qtyHundredths: 44700,
    unitPriceCents: 400,
  }),
  item({ description: 'Refinish steps and handrails', unit: 'lump sum', lumpSumCents: 300000 }),
];

describe('lineAmountCents', () => {
  it('matches the sample lines', () => {
    expect(SAMPLE.map(lineAmountCents)).toEqual([138125, 1218750, 178800, 300000]);
  });

  it('rounds half up', () => {
    // 0.5 sq ft × $0.01 = 0.5 cents → 1 cent
    expect(lineAmountCents(item({ qtyHundredths: 50, unitPriceCents: 1 }))).toBe(1);
    // 0.49 × $0.01 = 0.49 cents → 0
    expect(lineAmountCents(item({ qtyHundredths: 49, unitPriceCents: 1 }))).toBe(0);
  });

  it('uses the entered amount for lump sum, ignoring qty and price', () => {
    expect(
      lineAmountCents(
        item({ unit: 'lump sum', qtyHundredths: 100, unitPriceCents: 999, lumpSumCents: 5 }),
      ),
    ).toBe(5);
  });
});

describe('computeTotals (SPEC §6)', () => {
  it('total = $18,356.75', () => {
    expect(computeTotals(SAMPLE, { mode: 'none' })).toEqual({
      totalCents: 1835675,
      depositCents: 0,
      balanceCents: 1835675,
    });
  });

  it('deposit 30% = $5,507.03, balance $12,849.72', () => {
    expect(computeTotals(SAMPLE, { mode: 'percent', percentHundredths: 3000 })).toEqual({
      totalCents: 1835675,
      depositCents: 550703,
      balanceCents: 1284972,
    });
  });

  it('deposit 20% = $3,671.35, balance $14,685.40', () => {
    expect(computeTotals(SAMPLE, { mode: 'percent', percentHundredths: 2000 })).toEqual({
      totalCents: 1835675,
      depositCents: 367135,
      balanceCents: 1468540,
    });
  });
});

describe('depositCents', () => {
  it('uses a fixed amount', () => {
    expect(depositCents(100000, { mode: 'fixed', cents: 25000 })).toBe(25000);
  });
  it('never exceeds the total', () => {
    expect(depositCents(100000, { mode: 'fixed', cents: 250000 })).toBe(100000);
    expect(depositCents(100000, { mode: 'percent', percentHundredths: 15000 })).toBe(100000);
  });
  it('supports fractional percentages', () => {
    // 12.5% of $100.00
    expect(depositCents(10000, { mode: 'percent', percentHundredths: 1250 })).toBe(1250);
  });
});

describe('invoice extra charges (SPEC §3.7c)', () => {
  const extras = [
    { id: 'a', description: 'Debris disposal', amountCents: 5000 },
    { id: 'b', description: 'Extra trip', amountCents: 12500 },
  ];
  it('adds extras to the total, then applies deposit and balance', () => {
    expect(computeTotals(SAMPLE, { mode: 'fixed', cents: 550703 }, extras)).toEqual({
      totalCents: 1853175,
      depositCents: 550703,
      balanceCents: 1302472,
    });
  });
  it('totals each option with the extras', () => {
    expect(
      optionTotals({
        options: [{ id: 'o', title: '', description: '', items: SAMPLE }],
        deposit: { mode: 'none' },
        extras,
      }),
    ).toEqual([{ totalCents: 1853175, depositCents: 0, balanceCents: 1853175 }]);
  });
});
