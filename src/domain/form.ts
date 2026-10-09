import { z } from 'zod';
import { computeTotals } from './calc';
import { LIMITS } from './limits';
import { parseMoneyToCents, parseQtyToHundredths } from './money';
import { DEFAULT_TERMS } from './terms';
import {
  DOC_TYPES,
  UNITS,
  type Deposit,
  type DocType,
  type DocumentData,
  type ExtraCharge,
  type LineItem,
  type WorkProcess,
} from './types';

export const DEPOSIT_MODES = ['none', '20', '30', 'percent', 'fixed'] as const;
export type DepositMode = (typeof DEPOSIT_MODES)[number];

const text = (max: number) => z.string().max(max);
const numeric = text(LIMITS.numericInput);

/**
 * Raw form values, exactly as typed. This is also the shape of the saved draft, so incomplete
 * input survives a reload. Only lengths and enums are checked here.
 */
export const formValuesSchema = z.object({
  type: z.enum(DOC_TYPES),
  number: text(LIMITS.number),
  date: text(10),
  estimateRef: text(LIMITS.number),
  customer: z.object({
    name: text(LIMITS.customerName),
    address: text(LIMITS.address),
    phone: text(LIMITS.phone),
    email: text(LIMITS.email),
  }),
  jobDescription: text(LIMITS.jobDescription),
  items: z
    .array(
      z.object({
        id: text(40),
        description: text(LIMITS.itemDescription),
        detail: text(LIMITS.itemDetail),
        unit: z.enum(UNITS),
        otherUnit: text(LIMITS.otherUnit),
        qty: numeric,
        unitPrice: numeric,
        lumpSum: numeric,
      }),
    )
    .max(LIMITS.maxItems),
  depositMode: z.enum(DEPOSIT_MODES),
  depositPercent: numeric,
  depositFixed: numeric,
  /** Invoice extras and the estimate work process keep their text even when switched off. */
  extrasOn: z.boolean(),
  extras: z
    .array(z.object({ id: text(40), description: text(LIMITS.extraDescription), amount: numeric }))
    .max(LIMITS.maxExtras),
  processOn: z.boolean(),
  processNote: text(LIMITS.processNote),
  steps: z
    .array(z.object({ id: text(40), title: text(LIMITS.stepTitle), body: text(LIMITS.stepBody) }))
    .max(LIMITS.maxSteps),
  terms: text(LIMITS.terms),
});

export type FormValues = z.infer<typeof formValuesSchema>;
export type FormItem = FormValues['items'][number];
export type FormExtra = FormValues['extras'][number];
export type FormStep = FormValues['steps'][number];

export const emptyExtra = (): FormExtra => ({
  id: crypto.randomUUID(),
  description: '',
  amount: '',
});
export const emptyStep = (): FormStep => ({ id: crypto.randomUUID(), title: '', body: '' });

export function emptyItem(): FormItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    detail: '',
    unit: 'sq ft',
    otherUnit: '',
    qty: '',
    unitPrice: '',
    lumpSum: '',
  };
}

export function emptyForm(
  type: DocType,
  number: string,
  date: string,
  depositPercent: string,
): FormValues {
  return {
    type,
    number,
    date,
    estimateRef: '',
    customer: { name: '', address: '', phone: '', email: '' },
    jobDescription: '',
    items: [],
    depositMode: depositPercent === '20' || depositPercent === '30' ? depositPercent : 'percent',
    depositPercent,
    depositFixed: '',
    extrasOn: false,
    extras: [],
    processOn: false,
    processNote: '',
    steps: [],
    terms: DEFAULT_TERMS[type],
  };
}

/** Percent input → hundredths of a percent ("12.5" → 1250). */
function parsePercent(raw: string): number | null {
  return parseQtyToHundredths(raw.replace(/%/g, ''));
}

function depositOf(
  values: Pick<FormValues, 'depositMode' | 'depositPercent' | 'depositFixed'>,
): Deposit {
  switch (values.depositMode) {
    case 'none':
      return { mode: 'none' };
    case '20':
      return { mode: 'percent', percentHundredths: 2000 };
    case '30':
      return { mode: 'percent', percentHundredths: 3000 };
    case 'percent':
      return { mode: 'percent', percentHundredths: parsePercent(values.depositPercent) ?? 0 };
    case 'fixed':
      return { mode: 'fixed', cents: parseMoneyToCents(values.depositFixed) ?? 0 };
  }
}

export function toLenientItem(item: FormItem): LineItem {
  const lump = item.unit === 'lump sum';
  return {
    id: item.id,
    description: item.description.trim(),
    detail: item.detail.trim(),
    unit: item.unit,
    otherUnit: item.otherUnit.trim(),
    qtyHundredths: lump ? 0 : (parseQtyToHundredths(item.qty) ?? 0),
    unitPriceCents: lump ? 0 : (parseMoneyToCents(item.unitPrice) ?? 0),
    lumpSumCents: lump ? (parseMoneyToCents(item.lumpSum) ?? 0) : 0,
  };
}

/** Best-effort conversion for the live total and live preview: anything unparseable counts as 0. */
export function toLenientDocument(values: FormValues): DocumentData {
  return {
    type: values.type,
    number: values.number.trim(),
    date: values.date,
    estimateRef: values.estimateRef,
    customer: {
      name: values.customer.name.trim(),
      address: values.customer.address.trim(),
      phone: values.customer.phone.trim(),
      email: values.customer.email.trim(),
    },
    jobDescription: values.jobDescription.trim(),
    items: values.items.map(toLenientItem),
    deposit: depositOf(values),
    extras: extrasOf(values),
    process: processOf(values),
    terms: values.terms.trim(),
  };
}

/** Extras that count: invoice, switch on, both description and a valid amount. */
function extrasOf(values: FormValues): ExtraCharge[] {
  if (values.type !== 'invoice' || !values.extrasOn) return [];
  return values.extras.flatMap((x) => {
    const cents = parseMoneyToCents(x.amount);
    return x.description.trim() && cents !== null
      ? [{ id: x.id, description: x.description.trim(), cents }]
      : [];
  });
}

/** Empty steps are ignored; with nothing left the section isn't rendered (SPEC §3.13). */
function processOf(values: FormValues): WorkProcess | null {
  if (values.type !== 'estimate' || !values.processOn) return null;
  const steps = values.steps
    .map((s) => ({ id: s.id, title: s.title.trim(), body: s.body.trim() }))
    .filter((s) => s.title || s.body);
  const note = values.processNote.trim();
  return steps.length || note ? { note, steps } : null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Issue = { path: (string | number)[]; message: string };

/** Spanish messages, next to each field (SPEC §9). */
export function validateForm(values: FormValues): Issue[] {
  const issues: Issue[] = [];
  const add = (path: Issue['path'], message: string) => issues.push({ path, message });

  if (!values.number.trim()) add(['number'], 'Escribe el número del documento.');
  else if (!/^[A-Za-z0-9-]+$/.test(values.number.trim()))
    add(['number'], 'Usa solo letras, números y guiones.');

  if (!isRealDate(values.date)) add(['date'], 'Elige una fecha.');

  if (!values.customer.name.trim()) add(['customer', 'name'], 'Escribe el nombre del cliente.');

  const phoneDigits = values.customer.phone.replace(/\D/g, '');
  if (values.customer.phone.trim()) {
    const national = phoneDigits.length === 11 && phoneDigits.startsWith('1');
    if (phoneDigits.length < 10) add(['customer', 'phone'], 'Faltan dígitos: usa 10 números.');
    else if (phoneDigits.length > 10 && !national)
      add(['customer', 'phone'], 'Sobran dígitos: usa 10 números.');
  }

  if (values.customer.email.trim() && !EMAIL.test(values.customer.email.trim()))
    add(['customer', 'email'], 'Revisa el correo, ej. nombre@correo.com');

  if (values.items.length < LIMITS.minItems) add(['items'], 'Agrega al menos un trabajo.');

  values.items.forEach((item, i) => {
    const at = (field: string) => ['items', i, field];
    if (!item.description.trim()) add(at('description'), 'Escribe qué trabajo es.');
    if (item.unit === 'other' && !item.otherUnit.trim()) add(at('otherUnit'), 'Escribe la unidad.');

    if (item.unit === 'lump sum') {
      const cents = parseMoneyToCents(item.lumpSum);
      if (!item.lumpSum.trim()) add(at('lumpSum'), 'Falta el monto.');
      else if (cents === null) add(at('lumpSum'), 'Usa solo números, ej. 3000.00');
      else if (cents > LIMITS.maxTotalCents) add(at('lumpSum'), 'Máximo $10,000,000.');
      return;
    }

    const qty = parseQtyToHundredths(item.qty);
    if (!item.qty.trim()) add(at('qty'), 'Falta la cantidad.');
    else if (qty === null) add(at('qty'), 'Usa solo números, ej. 1625 o 12.5');
    else if (qty === 0) add(at('qty'), 'La cantidad debe ser mayor que 0.');
    else if (qty > LIMITS.maxQtyHundredths) add(at('qty'), 'Máximo 1,000,000.');

    const unitLabel = item.unit === 'other' ? item.otherUnit.trim() || 'unidad' : item.unit;
    const price = parseMoneyToCents(item.unitPrice);
    if (!item.unitPrice.trim()) add(at('unitPrice'), `Falta el precio por ${unitLabel}.`);
    else if (price === null) add(at('unitPrice'), 'Usa solo números, ej. 7.50');
    else if (price > LIMITS.maxUnitPriceCents) add(at('unitPrice'), 'Máximo $100,000.');
  });

  const doc = toLenientDocument(values);
  const { totalCents } = computeTotals(doc.items, { mode: 'none' });
  if (totalCents > LIMITS.maxTotalCents) add(['items'], 'El total no puede pasar de $10,000,000.');

  if (values.depositMode === 'percent') {
    const pct = parsePercent(values.depositPercent);
    if (pct === null || pct === 0 || pct > 10_000)
      add(['depositPercent'], 'Usa un porcentaje entre 1 y 100.');
  }
  if (values.depositMode === 'fixed') {
    const cents = parseMoneyToCents(values.depositFixed);
    if (cents === null) add(['depositFixed'], 'Escribe el monto del anticipo.');
    else if (cents > totalCents)
      add(['depositFixed'], 'El anticipo no puede ser mayor que el total de los trabajos.');
  }

  if (values.type === 'invoice' && values.extrasOn)
    values.extras.forEach((x, i) => {
      if (!x.description.trim() && !x.amount.trim()) return; // empty lines are ignored
      if (!x.description.trim()) add(['extras', i, 'description'], 'Escribe el concepto.');
      if (!x.amount.trim()) add(['extras', i, 'amount'], 'Falta el monto.');
      else if (parseMoneyToCents(x.amount) === null)
        add(['extras', i, 'amount'], 'Usa solo números, ej. 240.00');
    });

  // Title required, explanation optional (SPEC §3.13); a fully empty step is ignored.
  if (values.type === 'estimate' && values.processOn)
    values.steps.forEach((step, i) => {
      if (step.body.trim() && !step.title.trim())
        add(['steps', i, 'title'], 'Escribe el título del paso.');
    });

  return issues;
}

/** Validates raw form values and returns the document model (zod at the form → model edge). */
export const documentSchema = formValuesSchema.transform((values, ctx): DocumentData => {
  const issues = validateForm(values);
  for (const issue of issues)
    ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
  return issues.length ? z.NEVER : toLenientDocument(values);
});

/**
 * SPEC §3.9: the invoice keeps customer, description, items and deposit (its label becomes
 * "received" through the type); new INV number and date; the estimate number goes to "Estimate
 * ref."; the work process doesn't carry over.
 */
export function toInvoiceValues(est: FormValues, number: string, today: string): FormValues {
  return {
    ...est,
    type: 'invoice',
    number,
    date: today,
    estimateRef: est.type === 'estimate' ? est.number : est.estimateRef,
    terms: DEFAULT_TERMS.invoice,
    processOn: false,
    processNote: '',
    steps: [],
  };
}

/** "6105550142" / "1 610 555 0142" → "(610) 555-0142"; anything else is left as typed. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : raw.trim();
}
