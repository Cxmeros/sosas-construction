import { describe, expect, it } from 'vitest';
import { computeTotals, optionTotals } from './calc';
import {
  documentSchema,
  emptyForm,
  emptyOption,
  toLenientDocument,
  type FormItem,
  type FormValues,
} from './form';

const sampleItems = (): FormItem[] => [
  {
    id: 'a',
    description: 'Remove carpet and hardwood floor',
    unit: 'sq ft',
    otherUnit: '',
    qty: '1625',
    unitPrice: '0.85',
    lumpSum: '',
  },
  {
    id: 'b',
    description: 'Install and refinish',
    unit: 'sq ft',
    otherUnit: '',
    qty: '1,625',
    unitPrice: '7.50',
    lumpSum: '',
  },
  {
    id: 'c',
    description: 'Refinish scraper hardwood floors',
    unit: 'sq ft',
    otherUnit: '',
    qty: '447',
    unitPrice: '4',
    lumpSum: '',
  },
  {
    id: 'd',
    description: 'Refinish steps and handrails',
    unit: 'lump sum',
    otherUnit: '',
    qty: '',
    unitPrice: '',
    lumpSum: '3,000.00',
  },
];

const valid = (): FormValues => ({
  ...emptyForm('estimate', 'EST-20261005-01', '2026-10-05', '30'),
  customer: { name: 'Margaret Kelly', address: '', phone: '(610) 555-0142', email: '' },
  options: [{ id: 'o1', title: '', description: '', items: sampleItems() }],
});
/** The items of the first option, for in-place edits. */
const items = (values: FormValues) => values.options[0]!.items;

const messages = (values: FormValues) => {
  const result = documentSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('documentSchema', () => {
  it('turns the sample form into the SPEC §6 totals', () => {
    const doc = documentSchema.parse(valid());
    expect(computeTotals(doc.options[0]!.items, doc.deposit)).toEqual({
      totalCents: 1835675,
      depositCents: 550703,
      balanceCents: 1284972,
    });
  });

  it('requires a customer name and at least one item', () => {
    const values = {
      ...valid(),
      customer: { ...valid().customer, name: ' ' },
      options: [emptyOption()],
    };
    expect(messages(values)).toMatchObject({
      'customer.name': 'Escribe el nombre del cliente.',
      'options.0.items': 'Agrega al menos un trabajo.',
    });
  });

  it('flags missing price with the unit, in Spanish', () => {
    const values = valid();
    items(values)[1] = { ...items(values)[1]!, unitPrice: '' };
    expect(messages(values)).toEqual({
      'options.0.items.1.unitPrice': 'Falta el precio por sq ft.',
    });
  });

  it('requires the free-text unit for "other" and caps it at 15 characters', () => {
    const values = valid();
    items(values)[0] = { ...items(values)[0]!, unit: 'other', otherUnit: '' };
    expect(messages(values)).toEqual({ 'options.0.items.0.otherUnit': 'Escribe la unidad.' });
    items(values)[0] = { ...items(values)[0]!, otherUnit: 'x'.repeat(16) };
    expect(documentSchema.safeParse(values).success).toBe(false);
  });

  it('ignores qty and price for lump sum', () => {
    const values = valid();
    items(values)[3] = { ...items(values)[3]!, qty: 'garbage', unitPrice: 'garbage' };
    expect(documentSchema.safeParse(values).success).toBe(true);
  });

  it('validates phone digits and email when given', () => {
    const values = {
      ...valid(),
      customer: { name: 'A', address: '', phone: '610 555', email: 'nope' },
    };
    expect(messages(values)).toEqual({
      'customer.phone': 'Faltan dígitos: usa 10 números.',
      'customer.email': 'Revisa el correo, ej. nombre@correo.com',
    });
    const ok = {
      ...valid(),
      customer: { name: 'A', address: '', phone: '+1 610-555-0142', email: 'a@b.co' },
    };
    expect(documentSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects a fixed deposit above the total', () => {
    const values = { ...valid(), depositMode: 'fixed' as const, depositFixed: '20000' };
    expect(messages(values)).toEqual({
      depositFixed: 'El anticipo no puede ser mayor que el total.',
    });
  });

  it('enforces quantity, price and total limits', () => {
    const values = valid();
    items(values)[0] = { ...items(values)[0]!, qty: '1000000.01' };
    items(values)[1] = { ...items(values)[1]!, unitPrice: '100000.01' };
    expect(messages(values)).toMatchObject({
      'options.0.items.0.qty': 'Máximo 1,000,000.',
      'options.0.items.1.unitPrice': 'Máximo $100,000.',
    });
    const big = valid();
    items(big)[3] = { ...items(big)[3]!, lumpSum: '9999999' };
    expect(messages(big)).toEqual({
      'options.0.items': 'El total no puede pasar de $10,000,000.',
    });
  });

  it('rejects negative numbers', () => {
    const values = valid();
    items(values)[0] = { ...items(values)[0]!, qty: '-5' };
    expect(messages(values)).toEqual({
      'options.0.items.0.qty': 'Usa solo números, ej. 1625 o 12.5',
    });
  });

  it('rejects over-long text', () => {
    const values = { ...valid(), jobDescription: 'x'.repeat(1501) };
    expect(documentSchema.safeParse(values).success).toBe(false);
  });
});

describe('options', () => {
  const twoOptions = (): FormValues => ({
    ...valid(),
    options: [
      { id: 'o1', title: 'Refinish existing floors', description: '', items: sampleItems() },
      {
        id: 'o2',
        title: 'Install new flooring',
        description: 'New hardwood and trim.',
        items: [{ ...sampleItems()[3]!, id: 'x', lumpSum: '5465' }],
      },
    ],
  });

  it('totals each option separately, with the deposit applied to each', () => {
    const doc = documentSchema.parse(twoOptions());
    expect(doc.options.map((o) => o.title)).toEqual([
      'Refinish existing floors',
      'Install new flooring',
    ]);
    expect(optionTotals(doc)).toEqual([
      { totalCents: 1835675, depositCents: 550703, balanceCents: 1284972 },
      { totalCents: 546500, depositCents: 163950, balanceCents: 382550 },
    ]);
  });

  it('requires a name for each option once there are two or more', () => {
    const values = twoOptions();
    values.options[1] = { ...values.options[1]!, title: ' ' };
    expect(messages(values)).toEqual({ 'options.1.title': 'Escribe un nombre para la opción.' });
    // A single option needs no name.
    expect(documentSchema.safeParse(valid()).success).toBe(true);
  });

  it('validates items per option', () => {
    const values = twoOptions();
    values.options[1] = { ...values.options[1]!, items: [] };
    values.options[0]!.items[0] = { ...values.options[0]!.items[0]!, qty: '' };
    expect(messages(values)).toEqual({
      'options.0.items.0.qty': 'Falta la cantidad.',
      'options.1.items': 'Agrega al menos un trabajo.',
    });
  });

  it('keeps a fixed deposit within the smallest option', () => {
    const values = { ...twoOptions(), depositMode: 'fixed' as const, depositFixed: '6000' };
    expect(messages(values)).toEqual({
      depositFixed: 'El anticipo no puede ser mayor que el total de ninguna opción.',
    });
  });

  it('allows at most 3 options, and only one on an invoice', () => {
    const four = { ...twoOptions(), options: [...twoOptions().options, ...twoOptions().options] };
    expect(documentSchema.safeParse(four).success).toBe(false);
    expect(messages({ ...twoOptions(), type: 'invoice' })).toEqual({
      options: 'Un invoice lleva una sola opción: la que aceptó el cliente.',
    });
  });

  it('caps option name and description length', () => {
    const values = twoOptions();
    values.options[0] = { ...values.options[0]!, title: 'x'.repeat(81) };
    expect(documentSchema.safeParse(values).success).toBe(false);
    values.options[0] = { ...values.options[0]!, title: 'ok', description: 'x'.repeat(601) };
    expect(documentSchema.safeParse(values).success).toBe(false);
  });
});

describe('toLenientDocument', () => {
  it('counts unparseable numbers as zero', () => {
    const values = valid();
    items(values)[0] = { ...items(values)[0]!, qty: '12abc' };
    const doc = toLenientDocument(values);
    expect(computeTotals(doc.options[0]!.items, { mode: 'none' }).totalCents).toBe(
      1835675 - 138125,
    );
  });

  it('maps deposit modes', () => {
    expect(toLenientDocument({ ...valid(), depositMode: '20' }).deposit).toEqual({
      mode: 'percent',
      percentHundredths: 2000,
    });
    expect(
      toLenientDocument({ ...valid(), depositMode: 'percent', depositPercent: '12.5' }).deposit,
    ).toEqual({
      mode: 'percent',
      percentHundredths: 1250,
    });
    expect(
      toLenientDocument({ ...valid(), depositMode: 'fixed', depositFixed: '500' }).deposit,
    ).toEqual({
      mode: 'fixed',
      cents: 50000,
    });
    expect(toLenientDocument({ ...valid(), depositMode: 'none' }).deposit).toEqual({
      mode: 'none',
    });
  });
});
