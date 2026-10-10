import { describe, expect, it } from 'vitest';
import { computeTotals, documentTotals } from './calc';
import {
  documentSchema,
  emptyExtra,
  emptyForm,
  emptyStep,
  formatPhone,
  toAmountOnly,
  toEstimateItem,
  toInvoiceValues,
  toLenientDocument,
  type FormItem,
  type FormValues,
} from './form';
import { formatCents } from './money';

const item = (
  description: string,
  qty: string,
  unitPrice: string,
  unit: FormItem['unit'] = 'sq ft',
): FormItem => ({
  id: description,
  description,
  detail: '',
  unit,
  otherUnit: '',
  qty,
  unitPrice,
  lumpSum: '',
});

/** The SPEC §6 estimate: $18,356.75 of work. */
const estimate = (): FormValues => ({
  ...emptyForm('estimate', 'EST-20261005-01', '2026-10-05', '30'),
  customer: { name: 'Margaret Kelly', address: '', phone: '6105550142', email: '' },
  items: [
    item('Remove carpet and hardwood floor', '1625', '0.85'),
    item('Install and refinish', '1625', '7.50'),
    item('Refinish scraper hardwood floors', '447', '4'),
    {
      ...item('Refinish steps and handrails', '', '', 'lump sum'),
      detail: '15 steps, 10 sticks',
      lumpSum: '3000',
    },
  ],
});

const withExtras = (values: FormValues, on: boolean): FormValues => ({
  ...values,
  extrasOn: on,
  extras: [
    { id: 'x1', description: 'Debris disposal', amount: '50' },
    { id: 'x2', description: 'Carpet removal', amount: '150' },
    { id: 'x3', description: 'Cabinet protection', amount: '40' },
  ],
});

const messages = (values: FormValues) => {
  const r = documentSchema.safeParse(values);
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

const invoice = () => toInvoiceValues(estimate(), 'INV-20261006-01', '2026-10-06');

describe('invoice with extra charges (SPEC §3.12, mandatory case)', () => {
  it('work $18,356.75 + extras $240.00 = $18,596.75; 30 % on the work = $5,507.03; balance $13,089.72', () => {
    const t = documentTotals(toLenientDocument(withExtras(invoice(), true)));
    expect(
      [t.workCents, t.extrasCents, t.totalCents, t.depositCents, t.balanceCents].map(formatCents),
    ).toEqual(['$18,356.75', '$240.00', '$18,596.75', '$5,507.03', '$13,089.72']);
  });
  it('extras switched off do not count, but stay in the draft', () => {
    const v = withExtras(invoice(), false);
    const doc = toLenientDocument(v);
    expect(doc.extras).toEqual([]);
    expect(documentTotals(doc).totalCents).toBe(1835675);
    expect(v.extras).toHaveLength(3);
  });
  it('extras never apply to an estimate', () => {
    expect(toLenientDocument(withExtras(estimate(), true)).extras).toEqual([]);
  });
  it('a half-filled extra line is an error; an empty one is ignored', () => {
    const v = {
      ...invoice(),
      extrasOn: true,
      extras: [emptyExtra(), { id: 'b', description: 'Disposal', amount: '' }],
    };
    expect(messages(v)).toEqual({ 'extras.1.amount': 'Falta el monto.' });
  });
});

describe('deposit (SPEC §3.6)', () => {
  it('"Sin anticipo": balance = total', () => {
    const t = documentTotals(toLenientDocument({ ...estimate(), depositMode: 'none' }));
    expect(t.depositCents).toBe(0);
    expect(t.balanceCents).toBe(t.totalCents);
  });
  it('a deposit above the work total is an error in Spanish', () => {
    const v: FormValues = { ...estimate(), depositMode: 'fixed', depositFixed: '20000' };
    expect(messages(v)).toEqual({
      depositFixed: 'El anticipo no puede ser mayor que el total de los trabajos.',
    });
  });
  it('is calculated on the work only', () => {
    expect(
      computeTotals([], { mode: 'percent', percentHundredths: 3000 }, [{ cents: 10000 }]),
    ).toMatchObject({ depositCents: 0, totalCents: 10000 });
  });
});

describe('convert estimate → invoice (SPEC §3.9)', () => {
  const est: FormValues = {
    ...estimate(),
    processOn: true,
    steps: [{ id: 's', title: 'Sand', body: '' }],
  };
  const inv = toInvoiceValues(est, 'INV-20261006-01', '2026-10-06');
  it('copies customer, items and deposit; new number, date and Estimate ref.', () => {
    expect(inv).toMatchObject({
      type: 'invoice',
      number: 'INV-20261006-01',
      date: '2026-10-06',
      estimateRef: 'EST-20261005-01',
      customer: est.customer,
      items: est.items.map(toAmountOnly),
      depositMode: '30',
    });
  });
  it('the work process does not carry over', () => {
    expect(inv).toMatchObject({ processOn: false, steps: [] });
    expect(toLenientDocument(inv).process).toBeNull();
  });
  it('the terms name the payee', () => {
    expect(inv.terms).toContain("Please make checks payable to Sosa's Constructions");
  });
});

describe('work process (SPEC §3.13)', () => {
  it('empty steps are ignored; nothing left → not rendered', () => {
    expect(
      toLenientDocument({ ...estimate(), processOn: true, steps: [emptyStep(), emptyStep()] })
        .process,
    ).toBeNull();
  });
  it('switched off → not rendered, but the text stays in the draft', () => {
    const v: FormValues = {
      ...estimate(),
      processOn: false,
      steps: [{ id: 's', title: 'Sand', body: 'x' }],
    };
    expect(toLenientDocument(v).process).toBeNull();
    expect(v.steps).toHaveLength(1);
  });
  it('keeps written steps in order; a step with text needs a title', () => {
    const v: FormValues = {
      ...estimate(),
      processOn: true,
      steps: [
        { id: 'a', title: 'Protect', body: '' },
        emptyStep(),
        { id: 'c', title: '', body: 'Sand it' },
      ],
    };
    expect(toLenientDocument(v).process?.steps.map((s) => s.title)).toEqual(['Protect', '']);
    expect(messages(v)).toEqual({ 'steps.2.title': 'Escribe el título del paso.' });
  });
});

describe('lump sum and other (SPEC §3.5)', () => {
  it('other needs its unit name; lump sum uses the amount', () => {
    const v = estimate();
    v.items = [{ ...item('Moving', '3', '75', 'other') }];
    expect(messages(v)).toEqual({ 'items.0.otherUnit': 'Escribe la unidad.' });
    v.items = [{ ...item('Moving', '3', '75', 'other'), otherUnit: 'rooms' }];
    expect(documentTotals(toLenientDocument(v)).workCents).toBe(22500);
    expect(documentTotals(toLenientDocument(estimate())).workCents).toBe(1835675);
  });
});

describe('phone (SPEC §3.3)', () => {
  it('shows (XXX) XXX-XXXX', () => {
    expect(formatPhone('6105550142')).toBe('(610) 555-0142');
    expect(formatPhone('+1 610.555.0142')).toBe('(610) 555-0142');
    expect(formatPhone('555')).toBe('555');
  });
  it('asks for 10 digits', () => {
    const v = estimate();
    v.customer.phone = '610 555';
    expect(messages(v)).toEqual({ 'customer.phone': 'Faltan dígitos: usa 10 números.' });
  });
});

describe('invoice items are amount only (SPEC §3.15)', () => {
  it('qty × price becomes a lump sum with the same cents; qty and price are kept', () => {
    expect(toAmountOnly(item('Install', '1625', '7.50'))).toMatchObject({
      unit: 'lump sum',
      lumpSum: '12187.50',
      qty: '1625',
      unitPrice: '7.50',
      estimateUnit: 'sq ft',
    });
  });
  it('back to estimate: qty × price return when the amount was not touched', () => {
    const original = item('Install', '1625', '7.50', 'linear ft');
    expect(toEstimateItem(toAmountOnly(original))).toEqual(original);
  });
  it('back to estimate: an amount changed on the invoice is kept as a lump sum', () => {
    const edited = { ...toAmountOnly(item('Install', '1625', '7.50')), lumpSum: '12000' };
    const back = toEstimateItem(edited);
    expect(back).toMatchObject({ unit: 'lump sum', lumpSum: '12000' });
    expect(back).not.toHaveProperty('estimateUnit');
  });
  it('an unfinished item round-trips too', () => {
    const original = item('Install', '', '7.50');
    expect(toEstimateItem(toAmountOnly(original))).toEqual(original);
  });
  it('an unfinished item gets an empty amount; a lump sum is left as is', () => {
    expect(toAmountOnly(item('Install', '', '7.50')).lumpSum).toBe('');
    const lump = { ...item('Steps', '', '', 'lump sum'), lumpSum: '3000' };
    expect(toAmountOnly(lump)).toBe(lump);
  });
  it('converting to invoice keeps the work total', () => {
    const v = invoice();
    expect(v.items.every((i) => i.unit === 'lump sum')).toBe(true);
    expect(documentTotals(toLenientDocument(v)).workCents).toBe(1835675);
  });
});
