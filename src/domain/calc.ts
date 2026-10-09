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

/** The deposit is calculated on the work only, never on the extra charges (SPEC §3.6). */
export function computeTotals(
  items: readonly LineItem[],
  deposit: Deposit,
  extras: readonly { cents: number }[] = [],
): Totals {
  const workCents = items.reduce((sum, item) => sum + lineAmountCents(item), 0);
  const extrasCents = extras.reduce((sum, x) => sum + x.cents, 0);
  const totalCents = workCents + extrasCents;
  const dep = depositCents(workCents, deposit);
  return { workCents, extrasCents, totalCents, depositCents: dep, balanceCents: totalCents - dep };
}

export const documentTotals = (doc: Pick<DocumentData, 'items' | 'deposit' | 'extras'>) =>
  computeTotals(doc.items, doc.deposit, doc.extras);
