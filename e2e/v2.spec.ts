import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, fillSample, isMobile, pdfText, watchConsole } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const preview = (page: Page) => page.getByLabel('Vista previa del PDF');
const openPreview = async (page: Page, mobile: boolean) => {
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
};

/** A saved v2 draft: 18 trabajos (the table needs two pages) and a 7-step work process. */
async function loadLongDraft(page: Page) {
  await page.evaluate(() => {
    const row = (description: string, qty: string, unitPrice: string) => ({
      id: description,
      description,
      detail: '',
      unit: 'sq ft',
      otherUnit: '',
      qty,
      unitPrice,
      lumpSum: '',
    });
    const values = {
      type: 'estimate',
      number: 'EST-20261005-02',
      date: '2026-10-05',
      estimateRef: '',
      customer: { name: 'Margaret Kelly', address: '412 Owen Ave', phone: '', email: '' },
      jobDescription: 'Whole-house flooring.',
      items: Array.from({ length: 18 }, (_, i) =>
        row(`Floor work area ${String(i + 1)}`, '100', '5'),
      ),
      depositMode: '30',
      depositPercent: '30',
      depositFixed: '',
      extrasOn: false,
      extras: [],
      processOn: true,
      processNote: 'This plan explains what will happen in your home.',
      steps: Array.from({ length: 7 }, (_, i) => ({
        id: `s${String(i)}`,
        title: `Step ${String(i + 1)}`,
        body: 'We cover doorways, stairs and cabinets with plastic sheeting. '.repeat(4),
      })),
      terms: 'This is an estimate, not a quote or contract.',
    };
    window.localStorage.setItem('sosa.draft.v2', JSON.stringify({ savedAt: Date.now(), values }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Seguir editando' }).click();
}

test('long estimate: table on two pages + work process on its own page', async ({ page }, info) => {
  const mobile = isMobile(info);
  const errors = watchConsole(page);
  await loadLongDraft(page);
  await openPreview(page, mobile);
  const p = preview(page);
  await expect(p.getByText('Continued on page 2 →')).toBeVisible();
  await expect(p.getByText('WORK ESTIMATE (continued)')).toBeVisible();
  await expect(p.getByText('Step-by-step work process on page 3.')).toBeVisible();
  await expect(p.getByText('WORK PROCESS', { exact: true })).toBeVisible();
  await expect(p.getByText('Page 3 of 3')).toBeVisible();

  // The real PDF says the same.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' }).click();
  const path = info.outputPath('long.pdf');
  await (await download).saveAs(path);
  const text = pdfText(path);
  for (const s of [
    'Continuedonpage2',
    'Step-by-stepworkprocessonpage3.',
    'WORKPROCESS',
    'Page3of3',
  ])
    expect(text).toContain(s);

  // Switched off: the process pages and the note disappear, the text stays.
  if (mobile) await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('switch', { name: 'Incluir pasos en el PDF' }).click();
  await openPreview(page, mobile);
  await expect(p.getByText('Page 2 of 2').first()).toBeVisible();
  await expect(p.getByText(/Step-by-step work process/)).toHaveCount(0);
  await expectNoErrors(errors);
});

test('convert to invoice + extra charges + totals (SPEC mandatory case)', async ({
  page,
}, info) => {
  const mobile = isMobile(info);
  await fillSample(page, mobile);
  await openPreview(page, mobile);
  await page.getByRole('button', { name: 'Convertir en Invoice' }).click();
  if (mobile) await page.getByRole('button', { name: 'Editar' }).click();

  await page.getByRole('switch', { name: 'Incluir cargos extra en el PDF' }).click();
  const charges = [
    ['Debris disposal', '50'],
    ['Carpet removal', '150'],
    ['Cabinet protection', '40'],
  ] as const;
  for (const [i, [description, amount]] of charges.entries()) {
    if (i > 0) await page.getByRole('button', { name: 'Agregar cargo' }).click();
    const card = page.getByRole('group', { name: `Cargo ${String(i + 1)}` });
    await card.getByLabel('Concepto').fill(description);
    await card.getByLabel('Monto $').fill(amount);
  }
  await expect(page.getByRole('heading', { name: /Cargos extra/ })).toContainText('$240.00');

  await openPreview(page, mobile);
  const p = preview(page);
  await expect(p.getByText('ADDITIONAL CHARGES', { exact: true })).toBeVisible();
  for (const s of ['$18,356.75', '$240.00', '$18,596.75', '−$5,507.03', '$13,089.72'])
    await expect(p.getByText(s, { exact: true }).first()).toBeVisible();
  // The invoice table has no measurements.
  await expect(p.getByText('UNIT PRICE')).toHaveCount(0);
});
