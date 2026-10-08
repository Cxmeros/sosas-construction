import { expect, test, type Page } from '@playwright/test';
import { FEATURES } from '../src/config/company';
import { addItem, expectNoErrors, isMobile, item, pdfText, watchConsole } from './helpers';

const today = () => {
  const d = new Date();
  return `${String(d.getFullYear())}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

/** Lump-sum item `n` of `option` (undefined while there is a single option). */
async function lump(
  page: Page,
  mobile: boolean,
  n: number,
  text: string,
  amount: string,
  option?: number,
) {
  const it = item(page, n, mobile, option);
  await it.description.fill(text);
  await it.unit.selectOption('lump sum');
  await it.amount.fill(amount);
}

/** The estimate the customer showed Danilo: two options, $4,200 and $5,465. */
async function buildTwoOptions(page: Page, mobile: boolean) {
  await page.getByLabel('Nombre', { exact: true }).fill('Margaret Kelly');
  await page.getByLabel('Teléfono').fill('(610) 555-0142');
  await addItem(page);
  await lump(page, mobile, 1, 'Refinish steps, risers and hallway', '1880');
  await addItem(page);
  await lump(page, mobile, 2, 'Refinish existing hardwood floors', '2320');

  await page.getByRole('button', { name: 'Agregar otra opción' }).click();
  const first = page.getByRole('group', { name: 'Opción 1' });
  const second = page.getByRole('group', { name: 'Opción 2' });
  // The first option needs a name now, so the cursor goes there.
  await expect(first.getByLabel('Nombre de la opción')).toBeFocused();
  await first.getByLabel('Nombre de la opción').fill('Refinish existing hardwood floors');
  await second.getByLabel('Nombre de la opción').fill('Install new hardwood flooring');
  await second.getByLabel('Qué incluye (opcional)').fill('New hardwood flooring and new trim.');
  // Option 2 starts with one empty item.
  await lump(page, mobile, 1, 'Refinish steps, risers and hallway', '1880', 2);
  await second.getByRole('button', { name: /agregar trabajo/i }).click();
  await lump(page, mobile, 2, 'Remove old flooring and install new hardwood', '3335', 2);
  await second.getByRole('button', { name: /agregar trabajo/i }).click();
  await lump(page, mobile, 3, 'Remove old trim and install new trim', '250', 2);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('options are turned off: no "Agregar otra opción"', async ({ page }) => {
  test.skip(FEATURES.estimateOptions, 'only while the feature is off');
  await addItem(page);
  await expect(page.getByRole('button', { name: /agregar trabajo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar otra opción' })).toHaveCount(0);
});

test.describe('with options on', () => {
  // SPEC §3.11: built but switched off after the October meeting; re-enable with the flag.
  test.skip(!FEATURES.estimateOptions, 'FEATURES.estimateOptions is off');

  test('two options side by side → PDF → invoice for the option the customer chose', async ({
    page,
  }, info) => {
    const mobile = isMobile(info);
    const errors = watchConsole(page);
    await buildTwoOptions(page, mobile);

    if (mobile) {
      await expect(page.getByText('1 · $4,200.00')).toBeVisible();
      await expect(page.getByText('2 · $5,465.00')).toBeVisible();
      await page.getByRole('button', { name: 'Ver PDF' }).click();
    }
    const preview = page.getByLabel('Vista previa del PDF');
    await expect(preview.getByText('OPTION 1', { exact: true })).toBeVisible();
    await expect(preview.getByText('OPTION 2', { exact: true })).toBeVisible();
    await expect(preview.getByText('Option 1 total')).toBeVisible();
    await expect(preview.getByText('$4,200.00')).toBeVisible();
    await expect(preview.getByText('$5,465.00')).toBeVisible();
    await expect(preview.getByText('Page 1 of 1')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' }).click();
    const path = info.outputPath('options.pdf');
    await (await download).saveAs(path);
    const text = pdfText(path);
    for (const s of [
      'OPTION1',
      'Refinishexistinghardwoodfloors',
      'Option1total',
      '$4,200.00',
      'OPTION2',
      'Installnewhardwoodflooring',
      'Option2total',
      '$5,465.00',
    ]) {
      expect(text).toContain(s);
    }

    // Convert: Danilo picks the option the customer accepted; the invoice carries only that one.
    await page.getByRole('button', { name: 'Convertir en Invoice' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Qué opción aceptó el cliente?' });
    await expect(dialog.getByRole('button', { name: 'Convertir en Invoice' })).toBeDisabled();
    await dialog.getByText('Opción 2').click();
    await dialog.getByRole('button', { name: 'Convertir en Invoice' }).click();
    await expect(page.getByRole('status').getByText(`INV-${today()}-01`)).toBeVisible();

    // An invoice asks what was actually received; the hint is 30 % of the chosen option.
    await page.getByRole('button', { name: /Usar \$1,639\.50/ }).click();
    await expect(page.getByLabel('Monto recibido $')).toHaveValue('1639.50');
    if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
    await expect(preview.getByText('INVOICE', { exact: true })).toBeVisible();
    await expect(preview.getByText('INSTALL NEW HARDWOOD FLOORING')).toBeVisible();
    await expect(preview.getByText('OPTION 1')).toHaveCount(0);
    await expect(preview.getByText('Refinish existing hardwood floors')).toHaveCount(0);
    await expect(preview.getByText('$5,465.00').first()).toBeVisible();
    await expect(preview.getByText('$3,825.50')).toBeVisible();
    await expectNoErrors(errors);
  });

  test('each option needs a name; an option can be removed', async ({ page }, info) => {
    const mobile = isMobile(info);
    await buildTwoOptions(page, mobile);
    const second = page.getByRole('group', { name: 'Opción 2' });
    await second.getByLabel('Nombre de la opción').fill('');
    if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
    else await page.getByRole('button', { name: 'Descargar PDF' }).click();
    await expect(second.getByText('Escribe un nombre para la opción.')).toBeVisible();

    await page.getByRole('button', { name: 'Quitar opción 2' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, quitar' }).click();
    await expect(page.getByRole('group', { name: 'Opción 2' })).toHaveCount(0);
    // Back to a single option: its items are named as before, and its name stays as a heading.
    await expect(item(page, 2, mobile).description).toHaveValue(
      'Refinish existing hardwood floors',
    );
    await expect(page.getByLabel('Nombre de la sección (opcional)')).toHaveValue(
      'Refinish existing hardwood floors',
    );
  });

  test('switching to Invoice with several options asks which one', async ({ page }, info) => {
    const mobile = isMobile(info);
    await buildTwoOptions(page, mobile);
    await page.getByText('Invoice', { exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: '¿Qué opción aceptó el cliente?' });
    await dialog.getByText('Opción 1').click();
    await dialog.getByRole('button', { name: 'Cambiar a Invoice' }).click();
    await expect(page.getByRole('group', { name: 'Opción 2' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Agregar otra opción' })).toHaveCount(0);
    await expect(page.getByLabel('Número')).toHaveValue(/^INV-/);
  });
});
