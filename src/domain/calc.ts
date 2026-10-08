import type { Deposit, DocumentData, ExtraCharge, LineItem, Totals } from './types';

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

export function extrasCents(extras: readonly ExtraCharge[]): number {
  return extras.reduce((sum, extra) => sum + extra.amountCents, 0);
}

/** Items plus invoice extra charges (SPEC §3.7c), then deposit and balance on that total. */
export function computeTotals(
  items: readonly LineItem[],
  deposit: Deposit,
  extras: readonly ExtraCharge[] = [],
): Totals {
  const totalCents =
    items.reduce((sum, item) => sum + lineAmountCents(item), 0) + extrasCents(extras);
  const dep = depositCents(totalCents, deposit);
  return { totalCents, depositCents: dep, balanceCents: totalCents - dep };
}

/** Totals of each option; the deposit setting applies to each option's own total. */
export function optionTotals(doc: Pick<DocumentData, 'options' | 'deposit' | 'extras'>): Totals[] {
  // Extras only exist on invoices, which have exactly one option.
  return doc.options.map((option) => computeTotals(option.items, doc.deposit, doc.extras));
}
