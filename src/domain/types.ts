export const DOC_TYPES = ['estimate', 'invoice'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const UNITS = ['sq ft', 'linear ft', 'steps', 'each', 'hours', 'lump sum', 'other'] as const;
export type Unit = (typeof UNITS)[number];

/** Amounts are integer cents; quantities are integer hundredths (CLAUDE.md principle 3). */
export interface LineItem {
  id: string;
  description: string;
  /** Optional small line under the description, e.g. "15 steps, 10 sticks". */
  detail: string;
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

/** Invoice only: a charge that came up during the job (SPEC §3.12). */
export interface ExtraCharge {
  id: string;
  description: string;
  cents: number;
}

/** Estimate only: optional step-by-step plan, printed on its own pages (SPEC §3.13). */
export interface WorkProcess {
  note: string;
  steps: { id: string; title: string; body: string }[];
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
  /** Only the lines that count: invoice, switch on, description and amount filled. */
  extras: ExtraCharge[];
  /** Null unless estimate, switch on and something written. */
  process: WorkProcess | null;
  terms: string;
}

export interface Totals {
  /** Sum of the items (trabajos): the deposit is calculated on this only. */
  workCents: number;
  extrasCents: number;
  /** work + extras. */
  totalCents: number;
  depositCents: number;
  balanceCents: number;
}
