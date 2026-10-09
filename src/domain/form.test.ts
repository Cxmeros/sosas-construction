import { describe, expect, it } from 'vitest';
import { computeTotals } from './calc';
import { documentSchema, emptyForm, toLenientDocument, type FormValues } from './form';

const valid = (): FormValues => ({
  ...emptyForm('estimate', 'EST-20261005-01', '2026-10-05', '30'),
  customer: { name: 'Margaret Kelly', address: '', phone: '(610) 555-0142', email: '' },
  items: [
    {
      id: 'a',
      description: 'Remove carpet and hardwood floor',
      detail: '',
      unit: 'sq ft',
      otherUnit: '',
      qty: '1625',
      unitPrice: '0.85',
      lumpSum: '',
    },
    {
      id: 'b',
      description: 'Install and refinish',
      detail: '',
      unit: 'sq ft',
      otherUnit: '',
      qty: '1,625',
      unitPrice: '7.50',
      lumpSum: '',
    },
    {
      id: 'c',
      description: 'Refinish scraper hardwood floors',
      detail: '',
      unit: 'sq ft',
      otherUnit: '',
      qty: '447',
      unitPrice: '4',
      lumpSum: '',
    },
    {
      id: 'd',
      description: 'Refinish steps and handrails',
      detail: '',
      unit: 'lump sum',
      otherUnit: '',
      qty: '',
      unitPrice: '',
      lumpSum: '3,000.00',
    },
  ],
});

const messages = (values: FormValues) => {
  const result = documentSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('documentSchema', () => {
  it('turns the sample form into the SPEC §6 totals', () => {
    const doc = documentSchema.parse(valid());
    expect(computeTotals(doc.items, doc.deposit)).toMatchObject({
      totalCents: 1835675,
      depositCents: 550703,
      balanceCents: 1284972,
    });
  });

  it('requires a customer name and at least one item', () => {
    const values = { ...valid(), customer: { ...valid().customer, name: ' ' }, items: [] };
    expect(messages(values)).toMatchObject({
      'customer.name': 'Escribe el nombre del cliente.',
      items: 'Agrega al menos un trabajo.',
    });
  });

  it('flags missing price with the unit, in Spanish', () => {
    const values = valid();
    values.items[1] = { ...values.items[1]!, unitPrice: '' };
    expect(messages(values)).toEqual({ 'items.1.unitPrice': 'Falta el precio por sq ft.' });
  });

  it('requires the free-text unit for "other" and caps it at 15 characters', () => {
    const values = valid();
    values.items[0] = { ...values.items[0]!, unit: 'other', otherUnit: '' };
    expect(messages(values)).toEqual({ 'items.0.otherUnit': 'Escribe la unidad.' });
    values.items[0] = { ...values.items[0]!, otherUnit: 'x'.repeat(16) };
    expect(documentSchema.safeParse(values).success).toBe(false);
  });

  it('ignores qty and price for lump sum', () => {
    const values = valid();
    values.items[3] = { ...values.items[3]!, qty: 'garbage', unitPrice: 'garbage' };
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
      depositFixed: 'El anticipo no puede ser mayor que el total de los trabajos.',
    });
  });

  it('enforces quantity, price and total limits', () => {
    const values = valid();
    values.items[0] = { ...values.items[0]!, qty: '1000000.01' };
    values.items[1] = { ...values.items[1]!, unitPrice: '100000.01' };
    expect(messages(values)).toMatchObject({
      'items.0.qty': 'Máximo 1,000,000.',
      'items.1.unitPrice': 'Máximo $100,000.',
    });
    const big = valid();
    big.items[3] = { ...big.items[3]!, lumpSum: '9999999' };
    expect(messages(big)).toEqual({ items: 'El total no puede pasar de $10,000,000.' });
  });

  it('rejects negative numbers', () => {
    const values = valid();
    values.items[0] = { ...values.items[0]!, qty: '-5' };
    expect(messages(values)).toEqual({ 'items.0.qty': 'Usa solo números, ej. 1625 o 12.5' });
  });

  it('rejects over-long text', () => {
    const values = { ...valid(), jobDescription: 'x'.repeat(1501) };
    expect(documentSchema.safeParse(values).success).toBe(false);
  });
});

describe('toLenientDocument', () => {
  it('counts unparseable numbers as zero', () => {
    const values = valid();
    values.items[0] = { ...values.items[0]!, qty: '12abc' };
    const doc = toLenientDocument(values);
    expect(computeTotals(doc.items, { mode: 'none' }).totalCents).toBe(1835675 - 138125);
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
