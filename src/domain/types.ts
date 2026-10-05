export const DOC_TYPES = ['estimate', 'invoice'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const UNITS = ['sq ft', 'linear ft', 'steps', 'each', 'hours', 'lump sum', 'other'] as const;
export type Unit = (typeof UNITS)[number];

/** Amounts are integer cents; quantities are integer hundredths (CLAUDE.md principle 3). */
export interface LineItem {
  id: string;
  description: string;
  unit: Unit;
  /** Free-text unit, only used when `unit === 'other'`. */
  otherUnit: string;
  qtyHundredths: number;
  unitPriceCents: number;
  /** Only used when `unit === 'lump sum'`. */
  lumpSumCents: number;
}

export type Deposit =
  | { mode: 'none' }
  | { mode: 'percent'; percentHundredths: number }
  | { mode: 'fixed'; cents: number };

export interface Customer {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface DocumentData {
  type: DocType;
  number: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  /** Number of the estimate an invoice was converted from, or ''. */
  estimateRef: string;
  customer: Customer;
  jobDescription: string;
  items: LineItem[];
  deposit: Deposit;
  terms: string;
}

export interface Totals {
  totalCents: number;
  depositCents: number;
  balanceCents: number;
}
