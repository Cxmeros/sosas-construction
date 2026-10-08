import { z } from 'zod';
import { computeTotals } from './calc';
import { LIMITS } from './limits';
import { parseMoneyToCents, parseQtyToHundredths } from './money';
import { DEFAULT_STEPS, DEFAULT_TERMS } from './terms';
import {
  DOC_TYPES,
  UNITS,
  type Deposit,
  type DocType,
  type DocumentData,
  type EstimateOption,
  type LineItem,
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
  options: z
    .array(
      z.object({
        id: text(40),
        title: text(LIMITS.optionTitle),
        description: text(LIMITS.optionDescription),
        items: z
          .array(
            z.object({
              id: text(40),
              description: text(LIMITS.itemDescription),
              unit: z.enum(UNITS),
              otherUnit: text(LIMITS.otherUnit),
              qty: numeric,
              unitPrice: numeric,
              lumpSum: numeric,
            }),
          )
          .max(LIMITS.maxItems),
      }),
    )
    .min(1)
    .max(LIMITS.maxOptions),
  /** Invoice extra charges (SPEC §3.7c); kept but ignored while the document is an estimate. */
  extras: z
    .array(z.object({ id: text(40), description: text(LIMITS.extraDescription), amount: numeric }))
    .max(LIMITS.maxExtras),
  /** Work-process steps as typed, one per line (estimate only). */
  steps: text(LIMITS.stepsText),
  depositMode: z.enum(DEPOSIT_MODES),
  depositPercent: numeric,
  depositFixed: numeric,
  terms: text(LIMITS.terms),
});

export type FormValues = z.infer<typeof formValuesSchema>;
export type FormOption = FormValues['options'][number];
export type FormItem = FormOption['items'][number];
export type FormExtra = FormValues['extras'][number];

export function emptyExtra(): FormExtra {
  return { id: crypto.randomUUID(), description: '', amount: '' };
}

export function emptyItem(): FormItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    unit: 'sq ft',
    otherUnit: '',
    qty: '',
    unitPrice: '',
    lumpSum: '',
  };
}

export function emptyOption(items: FormItem[] = []): FormOption {
  return { id: crypto.randomUUID(), title: '', description: '', items };
}

/**
 * Steps typed one per line → clean list. Blank lines are dropped and numbering Danilo typed
 * ("1.", "2)", "Step 3:") is removed, since the PDF numbers them itself.
 */
export function parseSteps(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^(?:step\s*)?\d+\s*[.):-]\s*/i, '')
        .trim(),
    )
    .filter(Boolean);
}

export function emptyForm(
  type: DocType,
  number: string,
  date: string,
  depositPercent: string,
  steps: string = DEFAULT_STEPS,
): FormValues {
  return {
    type,
    number,
    date,
    estimateRef: '',
    customer: { name: '', address: '', phone: '', email: '' },
    jobDescription: '',
    options: [emptyOption()],
    extras: [],
    steps,
    depositMode: depositPercent === '20' || depositPercent === '30' ? depositPercent : 'percent',
    depositPercent,
    depositFixed: '',
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
    options: values.options.map((option): EstimateOption => ({
      id: option.id,
      title: option.title.trim(),
      description: option.description.trim(),
      items: option.items.map(toLenientItem),
    })),
    extras:
      values.type === 'invoice'
        ? values.extras.map((extra) => ({
            id: extra.id,
            description: extra.description.trim(),
            amountCents: parseMoneyToCents(extra.amount) ?? 0,
          }))
        : [],
    steps: values.type === 'estimate' ? parseSteps(values.steps) : [],
    deposit: depositOf(values),
    terms: values.terms.trim(),
  };
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

  const multi = values.options.length > 1;
  if (multi && values.type === 'invoice')
    add(['options'], 'Un invoice lleva una sola opción: la que aceptó el cliente.');

  const doc = toLenientDocument(values);
  const totals = doc.options.map(
    (o) => computeTotals(o.items, { mode: 'none' }, doc.extras).totalCents,
  );

  if (values.type === 'estimate') {
    const steps = parseSteps(values.steps);
    if (steps.length > LIMITS.maxSteps)
      add(['steps'], `Máximo ${String(LIMITS.maxSteps)} pasos (uno por renglón).`);
    else if (steps.some((step) => step.length > LIMITS.stepLength))
      add(['steps'], `Cada paso puede tener hasta ${String(LIMITS.stepLength)} letras.`);
  }

  if (values.type === 'invoice') {
    values.extras.forEach((extra, i) => {
      const at = (field: string) => ['extras', i, field];
      const cents = parseMoneyToCents(extra.amount);
      if (!extra.description.trim()) add(at('description'), 'Escribe qué es el cargo.');
      if (!extra.amount.trim()) add(at('amount'), 'Falta el monto.');
      else if (cents === null) add(at('amount'), 'Usa solo números, ej. 50.00');
      else if (cents > LIMITS.maxTotalCents) add(at('amount'), 'Máximo $10,000,000.');
    });
  }

  values.options.forEach((option, k) => {
    const base = ['options', k];
    if (multi && !option.title.trim()) add([...base, 'title'], 'Escribe un nombre para la opción.');
    if (option.items.length < LIMITS.minItems)
      add([...base, 'items'], 'Agrega al menos un trabajo.');

    option.items.forEach((item, i) => {
      const at = (field: string) => [...base, 'items', i, field];
      if (!item.description.trim()) add(at('description'), 'Escribe qué trabajo es.');
      if (item.unit === 'other' && !item.otherUnit.trim())
        add(at('otherUnit'), 'Escribe la unidad.');

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

    if ((totals[k] ?? 0) > LIMITS.maxTotalCents)
      add([...base, 'items'], 'El total no puede pasar de $10,000,000.');
  });

  if (values.depositMode === 'percent') {
    const pct = parsePercent(values.depositPercent);
    if (pct === null || pct === 0 || pct > 10_000)
      add(['depositPercent'], 'Usa un porcentaje entre 1 y 100.');
  }
  if (values.depositMode === 'fixed') {
    const cents = parseMoneyToCents(values.depositFixed);
    // With several options the same fixed deposit applies to each, so it must fit the smallest.
    const smallest = Math.min(...totals);
    if (cents === null) add(['depositFixed'], 'Escribe el monto del anticipo.');
    else if (cents > smallest)
      add(
        ['depositFixed'],
        multi
          ? 'El anticipo no puede ser mayor que el total de ninguna opción.'
          : 'El anticipo no puede ser mayor que el total.',
      );
  }

  return issues;
}

/** Validates raw form values and returns the document model (zod at the form → model edge). */
export const documentSchema = formValuesSchema.transform((values, ctx): DocumentData => {
  const issues = validateForm(values);
  for (const issue of issues)
    ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
  return issues.length ? z.NEVER : toLenientDocument(values);
});
