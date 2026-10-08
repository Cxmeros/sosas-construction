import { expect, test } from '@playwright/test';
import {
  addItem,
  expectNoErrors,
  fillSample,
  isMobile,
  item,
  pdfText,
  watchConsole,
} from './helpers';

const today = () => {
  const d = new Date();
  return `${String(d.getFullYear())}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('full flow: estimate → PDF → convert to invoice → new document', async ({ page }, info) => {
  const mobile = isMobile(info);
  const errors = watchConsole(page);
  const number = `EST-${today()}-01`;
  await expect(page.getByLabel('Número')).toHaveValue(number);

  await fillSample(page, mobile);
  // SPEC §6: total, 30 % deposit (the default) and balance.
  await expect(page.getByText('$18,356.75').first()).toBeVisible();
  await expect(page.getByText('$5,507.03').first()).toBeAttached();
  await expect(page.getByText('$12,849.72').first()).toBeAttached();

  // 20 % deposit.
  await page.getByText('20 %', { exact: true }).click();
  await expect(page.getByText('$14,685.40').first()).toBeAttached();
  await page.getByText('30 %', { exact: true }).click();

  if (mobile) {
    await page.getByRole('button', { name: 'Ver PDF' }).click();
    await expect(page.getByText('Para Margaret Kelly')).toBeVisible();
  }
  const preview = page.getByLabel('Vista previa del PDF');
  await expect(preview.getByText('WORK ESTIMATE')).toBeVisible();
  await expect(preview.getByText('CUSTOMER INFORMATION')).toBeVisible();
  await expect(preview.getByText('Page 1 of 1')).toBeVisible();

  // Download the real PDF and check its text.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`Estimate_${number}_Margaret-Kelly.pdf`);
  const path = info.outputPath('estimate.pdf');
  await file.saveAs(path);
  const text = pdfText(path);
  for (const s of [
    'WORKESTIMATE',
    number,
    'MargaretKelly',
    '$18,356.75',
    'Depositrequired(30%)',
    '$5,507.03',
    '$12,849.72',
    'Page1of1',
  ]) {
    expect(text).toContain(s);
  }

  // Convert: keeps customer and items; new INV number, invoice terms, estimate reference.
  // The requested deposit is never carried over as money received: it asks, with a hint.
  await page.getByRole('button', { name: 'Convertir en Invoice' }).click();
  await expect(page.getByRole('status').getByText(`INV-${today()}-01`)).toBeVisible();
  // "Deshacer" brings the estimate back untouched.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByLabel('Número')).toHaveValue(number);
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  await page.getByRole('button', { name: 'Convertir en Invoice' }).click();
  await expect(page.getByRole('status').getByText(`INV-${today()}-02`)).toBeVisible();
  await expect(page.getByLabel('Monto recibido $')).toBeFocused();
  await page.getByRole('button', { name: /Usar \$5,507\.03/ }).click();
  await expect(page.getByLabel('Monto recibido $')).toHaveValue('5507.03');
  await expect(page.getByLabel('Nombre')).toHaveValue('Margaret Kelly');
  await expect(page.getByLabel('Número')).toHaveValue(`INV-${today()}-02`);
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  await expect(preview.getByText('INVOICE', { exact: true })).toBeVisible();
  await expect(preview.getByText('ESTIMATE REF.')).toBeVisible();
  await expect(preview.getByText(number).first()).toBeVisible();
  await expect(
    preview.getByText('Payment is due upon receipt. Thank you for your business.'),
  ).toBeVisible();
  await expect(preview.getByText('Deposit received', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convertir en Invoice' })).toHaveCount(0);

  // New document asks first (focus on the safe choice), then clears.
  await page.getByRole('button', { name: 'Nuevo documento' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Nuevo documento' }).click();
  await page.getByRole('button', { name: 'Sí, empezar nuevo' }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue('');
  await expect(page.getByLabel('Número')).toHaveValue(`EST-${today()}-02`);
  await expect(page.getByText('Aún no hay trabajos')).toBeVisible();

  await expectNoErrors(errors);
});

test('validation errors appear next to each field, in Spanish', async ({ page }, info) => {
  const mobile = isMobile(info);
  await page.getByRole('button', { name: mobile ? 'Ver PDF' : 'Compartir' }).click();
  await expect(page.getByRole('alert')).toContainText('Faltan 2 datos para crear el PDF');
  await expect(page.getByText('Escribe el nombre del cliente.')).toBeVisible();
  await expect(page.getByText('Agrega al menos un trabajo.')).toBeVisible();
  await expect(page.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Nombre')).toBeFocused();

  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Teléfono').fill('610 555');
  await expect(page.getByText('Escribe el nombre del cliente.')).toBeHidden();
  await expect(page.getByText('Faltan dígitos: usa 10 números.')).toBeVisible();

  await addItem(page);
  const it = item(page, 1, mobile);
  await it.description.fill('Install and refinish');
  await it.qty.fill('1625');
  // A new item isn't flagged while it's being filled in; the next attempt names what's missing.
  await expect(page.getByText('Falta el precio por sq ft.')).toBeHidden();
  await page.getByRole('button', { name: mobile ? 'Ver PDF' : 'Compartir' }).click();
  await expect(page.getByText('Falta el precio por sq ft.')).toBeVisible();
});

test('items: lump sum, other, delete with undo, reorder', async ({ page }, info) => {
  const mobile = isMobile(info);
  await addItem(page);
  await addItem(page);
  const first = item(page, 1, mobile);
  const second = item(page, 2, mobile);
  await first.description.fill('Stairs');
  await first.unit.selectOption('lump sum');
  await expect(first.amount).toBeVisible();
  if (mobile) await expect(first.qty).toHaveCount(0);
  else await expect(page.getByLabel('Cantidad trabajo 1')).toBeDisabled();
  await first.amount.fill('3000');

  await second.description.fill('Furniture moving');
  await second.unit.selectOption('other');
  await second.otherUnit.fill('rooms');
  await second.qty.fill('3');
  await second.price.fill('75');
  await expect(page.getByText('$225.00').first()).toBeVisible();
  if (!mobile)
    await expect(page.getByLabel('Vista previa del PDF').getByText('rooms')).toBeAttached();

  // Reorder: arrows on mobile, keyboard on the drag handle on desktop.
  if (mobile) await page.getByRole('button', { name: 'Bajar trabajo 1' }).click();
  else {
    await page.getByRole('button', { name: /Mover trabajo 1/ }).focus();
    await page.keyboard.press('ArrowDown');
  }
  await expect(item(page, 1, mobile).description).toHaveValue('Furniture moving');
  await expect(item(page, 2, mobile).description).toHaveValue('Stairs');

  await page.getByRole('button', { name: 'Eliminar trabajo 1' }).click();
  await expect(page.getByText('“Furniture moving” eliminado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeFocused();
  await expect(item(page, 1, mobile).description).toHaveValue('Stairs');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(item(page, 1, mobile).description).toHaveValue('Furniture moving');
  await expect(item(page, 2, mobile).description).toHaveValue('Stairs');
});

test('draft survives a reload and can be discarded', async ({ page }, info) => {
  const mobile = isMobile(info);
  await page.getByLabel('Nombre').fill('Margaret Kelly');
  await addItem(page);
  await item(page, 1, mobile).description.fill('Install and refinish');
  await expect(page.getByText(/guardado/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText('Recuperamos tu borrador')).toBeVisible();
  await expect(page.getByText(/Estimate EST-\d{8}-01 · Margaret Kelly · hoy/)).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue('Margaret Kelly');
  await expect(item(page, 1, mobile).description).toHaveValue('Install and refinish');

  await page.reload();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await page.getByRole('button', { name: 'Sí, descartar' }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue('');
  await page.reload();
  await expect(page.getByText('Recuperamos tu borrador')).toBeHidden();
});

test('corrupt saved data is ignored', async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem('sosa.draft.v1', '{"savedAt":1,"values":{"type":"hack"}}');
    window.localStorage.setItem('sosa.counters.v1', 'not json');
  });
  await page.reload();
  await expect(page.getByLabel('Nombre')).toHaveValue('');
  await expect(page.getByLabel('Número')).toHaveValue(/^EST-\d{8}-01$/);
});

test('share uses the Web Share API with the PDF file', async ({ page }, info) => {
  const mobile = isMobile(info);
  await page.addInitScript(() => {
    const w = window as unknown as { shared: { name: string; type: string }[] };
    w.shared = [];
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', {
      value: (data: { files: File[] }) => {
        w.shared.push(...data.files.map((f) => ({ name: f.name, type: f.type })));
        return Promise.resolve();
      },
    });
  });
  await page.reload();
  await fillSample(page, mobile);
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  await page.getByRole('button', { name: 'Compartir' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared))
    .toEqual([
      {
        name: expect.stringMatching(/^Estimate_EST-\d{8}-01_Margaret-Kelly\.pdf$/),
        type: 'application/pdf',
      },
    ]);
});

test('without file sharing, the panel offers WhatsApp, email and download', async ({
  page,
}, info) => {
  const mobile = isMobile(info);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined });
  });
  await page.reload();
  await fillSample(page, mobile);
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  await page.getByRole('button', { name: 'Compartir' }).click();
  const dialog = page.getByRole('dialog', { name: 'Enviar a Margaret Kelly' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /WhatsApp · \(610\) 555-0142/ })).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: /Correo · mkelly.home@gmail.com/ }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^Estimate_EST-\d{8}-01_Margaret-Kelly\.pdf$/,
  );
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
});

test('touch targets are at least 48 px', async ({ page }, info) => {
  const mobile = isMobile(info);
  await fillSample(page, mobile);
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'button, input:not([type=radio]), select, [role=radio], fieldset label',
      ),
    ]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => ({ el: el.outerHTML.slice(0, 80), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h < 47.5),
  );
  expect(small).toEqual([]);
});

test('the date picked in the form is the one in the downloaded PDF (date and number)', async ({
  page,
}, info) => {
  const mobile = isMobile(info);
  await fillSample(page, mobile);
  await page.getByLabel('Fecha').fill('2026-11-20');
  // The automatic number follows the date…
  await expect(page.getByLabel('Número')).toHaveValue('EST-20261120-01');
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('Estimate_EST-20261120-01_Margaret-Kelly.pdf');
  const path = info.outputPath('dated.pdf');
  await file.saveAs(path);
  const text = pdfText(path);
  expect(text).toContain('11/20/2026');
  expect(text).toContain('EST-20261120-01');
  expect(text).not.toContain(`EST-${today()}`);

  // …but a number Danilo typed himself is never changed.
  if (mobile) await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Número').fill('A-1043');
  await page.getByLabel('Fecha').fill('2026-12-01');
  await expect(page.getByLabel('Número')).toHaveValue('A-1043');
});

test('invoice: extra charges are added to the total and printed', async ({ page }, info) => {
  const mobile = isMobile(info);
  await fillSample(page, mobile);
  // Estimates have no extra charges.
  await expect(page.getByRole('button', { name: 'Agregar cargo extra' })).toHaveCount(0);

  // On the phone, "Convertir en Invoice" is on the preview screen; it returns to the form to ask
  // about the deposit received.
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  await page.getByRole('button', { name: 'Convertir en Invoice' }).click();
  await page.getByText('Sin anticipo', { exact: true }).click();
  await page.getByRole('button', { name: 'Agregar cargo extra' }).click();
  const extra = page.getByRole('listitem', { name: 'Cargo extra 1' });
  await expect(extra.getByLabel('Descripción')).toBeFocused();
  await extra.getByLabel('Descripción').fill('Debris disposal');
  await extra.getByLabel('Monto $').fill('50');

  if (mobile) {
    await expect(page.getByText('$18,406.75').first()).toBeVisible();
    await page.getByRole('button', { name: 'Ver PDF' }).click();
  }
  const preview = page.getByLabel('Vista previa del PDF');
  await expect(preview.getByText('ADDITIONAL CHARGES')).toBeVisible();
  await expect(preview.getByText('Debris disposal')).toBeVisible();
  await expect(preview.getByText('$18,406.75').first()).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' }).click();
  const path = info.outputPath('invoice-extras.pdf');
  await (await download).saveAs(path);
  const text = pdfText(path);
  for (const s of ['ADDITIONALCHARGES', 'Debrisdisposal$50.00', '$18,406.75'])
    expect(text).toContain(s);
});

test('invoice: an extra charge needs a description and an amount', async ({ page }, info) => {
  const mobile = isMobile(info);
  await fillSample(page, mobile);
  if (mobile) await page.getByRole('button', { name: 'Ver PDF' }).click();
  await page.getByRole('button', { name: 'Convertir en Invoice' }).click();
  await page.getByText('Sin anticipo', { exact: true }).click();
  await page.getByRole('button', { name: 'Agregar cargo extra' }).click();
  await page.getByRole('button', { name: mobile ? 'Ver PDF' : 'Descargar PDF' }).click();
  const extra = page.getByRole('listitem', { name: 'Cargo extra 1' });
  await expect(extra.getByText('Escribe qué es el cargo.')).toBeVisible();
  await expect(extra.getByText('Falta el monto.')).toBeVisible();
  await page.getByRole('button', { name: 'Quitar cargo extra 1' }).click();
  await expect(page.getByRole('listitem', { name: 'Cargo extra 1' })).toHaveCount(0);
});
