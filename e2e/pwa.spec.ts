import { expect, test } from '@playwright/test';
import { DAY, expectNoErrors, fillSample, isMobile, pdfText, watchConsole } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('is installable: manifest and icons', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  expect(href).toBe('/manifest.webmanifest');
  const manifest = (await (await request.get(href!)).json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(manifest).toMatchObject({
    name: "Sosa's Hardwood Floors · Estimates",
    display: 'standalone',
    start_url: '/',
  });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(['192x192', '512x512', '512x512']);
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await request.get(`/${icon.src}`);
    expect(res.headers()['content-type']).toBe('image/png');
  }
});

test('works offline after the first visit, including the PDF', async ({ page, context }, info) => {
  const mobile = isMobile(info);
  const errors = watchConsole(page);
  await page.goto('/');
  // Wait until the service worker controls the page and has precached everything.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Nombre')).toBeVisible();
  await fillSample(page, mobile);
  // No number yet and no connection: it says so instead of making one up (SPEC §5).
  const action = mobile ? 'Vista previa' : 'Descargar PDF';
  await page.getByRole('button', { name: action }).click();
  await expect(
    page.getByText('Sin internet. Conéctate para asignar el número o escríbelo a mano.'),
  ).toBeVisible();
  // A hand-typed number works offline and waits to be reported to the counter.
  const number = `EST-${DAY}-07`;
  await page.getByLabel('Número').fill(number);
  if (mobile) await page.getByRole('button', { name: 'Vista previa' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' }).click();
  const path = info.outputPath('offline.pdf');
  await (await download).saveAs(path);
  expect(pdfText(path)).toContain('$18,356.75');
  expect(await page.evaluate(() => window.localStorage.getItem('sosa.pending.v1'))).toBe(
    JSON.stringify([number]),
  );
  await context.setOffline(false);
  await expectNoErrors(errors);
});
