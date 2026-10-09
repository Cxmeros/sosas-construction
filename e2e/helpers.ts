import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';

export const isMobile = (info: TestInfo) => info.project.name === 'mobile-375';

export const SAMPLE_ITEMS = [
  { description: 'Remove carpet and hardwood floor', unit: 'sq ft', qty: '1625', price: '0.85' },
  { description: 'Install and refinish', unit: 'sq ft', qty: '1625', price: '7.50' },
  { description: 'Refinish scraper hardwood floors', unit: 'sq ft', qty: '447', price: '4' },
  {
    description: 'Refinish steps and handrails — 15 steps, 10 sticks',
    unit: 'lump sum',
    amount: '3000',
  },
] as const;

/** Fails the test on console errors, except react-pdf's known, recovered WASM data: fetch (README). */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (text.includes('data:application/octet-stream;base64')) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Inputs of item `n` (1-based), on the mobile cards or the desktop table. */
export function item(page: Page, n: number, mobile: boolean) {
  if (mobile) {
    const card = page.getByRole('listitem', { name: `Trabajo ${String(n)}` });
    return {
      description: card.getByLabel('Descripción'),
      unit: card.getByRole('combobox'),
      otherUnit: card.getByLabel('Escribe la unidad'),
      qty: card.getByLabel('Cantidad'),
      price: card.getByLabel(/^Precio por/),
      amount: card.getByLabel('Monto total $'),
    };
  }
  return {
    description: page.getByLabel(`Descripción trabajo ${String(n)}`),
    unit: page.getByLabel(`Unidad trabajo ${String(n)}`),
    otherUnit: page.getByLabel(`Unidad escrita trabajo ${String(n)}`),
    qty: page.getByLabel(`Cantidad trabajo ${String(n)}`),
    price: page.getByLabel(`Precio trabajo ${String(n)}`),
    amount: page.getByLabel(`Monto trabajo ${String(n)}`),
  };
}

export async function addItem(page: Page) {
  await page.getByRole('button', { name: /agregar (primer )?trabajo/i }).click();
}

export async function fillSample(page: Page, mobile: boolean) {
  await page.getByLabel('Nombre').fill('Margaret Kelly');
  await page.getByLabel('Dirección').fill('412 Owen Ave, Lansdowne, PA 19050');
  await page.getByLabel('Teléfono').fill('(610) 555-0142');
  await page.getByLabel('Email').fill('mkelly.home@gmail.com');
  await page
    .getByLabel('Descripción del trabajo')
    .fill(
      'Demolition of existing flooring area, removal of existing carpet, installation of new hardwood floors and refinishing.',
    );
  for (const [i, row] of SAMPLE_ITEMS.entries()) {
    await addItem(page);
    const it = item(page, i + 1, mobile);
    await it.description.fill(row.description);
    await it.unit.selectOption(row.unit);
    if ('amount' in row) await it.amount.fill(row.amount);
    else {
      await it.qty.fill(row.qty);
      await it.price.fill(row.price);
    }
  }
}

/** Text of a downloaded PDF, via poppler (whitespace removed: labels are letter-spaced). */
export function pdfText(file: string): string {
  // Poppler on Windows can't open paths with non-ASCII characters (test titles contain "→").
  const plain = join(mkdtempSync(join(tmpdir(), 'pdf-')), 'doc.pdf');
  copyFileSync(file, plain);
  return execFileSync('pdftotext', [plain, '-'], { encoding: 'utf8' }).replace(/\s+/g, '');
}

export async function expectNoErrors(errors: string[]) {
  await expect.poll(() => errors).toEqual([]);
}
