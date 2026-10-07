import type { Deposit, DocumentData, LineItem, Totals } from './types';

/** amount = qty × unit price, rounded half-up to the cent. Lump sum uses the entered amount. */
export function lineAmountCents(item: LineItem): number {
  if (item.unit === 'lump sum') return item.lumpSumCents;
  // Every operand is a non-negative integer, so Math.round is half-up.
  return Math.round((item.qtyHundredths * item.unitPriceCents) / 100);
}

export function depositCents(totalCents: number, deposit: Deposit): number {
  switch (deposit.mode) {
    case 'none':
      return 0;
    case 'percent':
      return Math.min(totalCents, Math.round((totalCents * deposit.percentHundredths) / 10_000));
    case 'fixed':
      return Math.min(totalCents, deposit.cents);
  }
}

export function computeTotals(items: readonly LineItem[], deposit: Deposit): Totals {
  const totalCents = items.reduce((sum, item) => sum + lineAmountCents(item), 0);
  const dep = depositCents(totalCents, deposit);
  return { totalCents, depositCents: dep, balanceCents: totalCents - dep };
}

/** Totals of each option; the deposit setting applies to each option's own total. */
export function optionTotals(doc: Pick<DocumentData, 'options' | 'deposit'>): Totals[] {
  return doc.options.map((option) => computeTotals(option.items, doc.deposit));
}
