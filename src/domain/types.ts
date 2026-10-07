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

/** One way of doing the job, with its own items and total (an estimate offers 1–3). */
export interface EstimateOption {
  id: string;
  /** Short name, e.g. "Refinish existing hardwood floors". Required when there are 2+ options. */
  title: string;
  description: string;
  items: LineItem[];
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
  /** Always at least one; an invoice has exactly one (the option the customer accepted). */
  options: EstimateOption[];
  deposit: Deposit;
  terms: string;
}

export interface Totals {
  totalCents: number;
  depositCents: number;
  balanceCents: number;
}
