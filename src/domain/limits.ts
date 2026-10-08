/** Input limits (SPEC §3 and §6). */
export const LIMITS = {
  customerName: 100,
  address: 200,
  phone: 30,
  email: 120,
  jobDescription: 1500,
  itemDescription: 200,
  otherUnit: 15,
  terms: 1000,
  number: 30,
  optionTitle: 80,
  optionDescription: 600,
  maxOptions: 3,
  extraDescription: 100,
  maxExtras: 10,
  /** Work-process steps (SPEC §3.7b): one per line. */
  maxSteps: 15,
  stepLength: 200,
  stepsText: 3200,
  minItems: 1,
  /** Per option. */
  maxItems: 30,
  maxQtyHundredths: 1_000_000 * 100,
  maxUnitPriceCents: 100_000 * 100,
  maxTotalCents: 10_000_000 * 100,
  /** Raw numeric input fields (before parsing). */
  numericInput: 20,
} as const;
