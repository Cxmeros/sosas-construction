import { expect, test } from '@playwright/test';
import {
  DAY,
  expectNoErrors,
  fillSample,
  isMobile,
  mockCounter,
  pdfText,
  watchConsole,
} from './helpers';

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
  await mockCounter(context);
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
  // Offline the preview works, but a new document can't get its number, and none is made up.
  if (mobile) await page.getByRole('button', { name: 'Vista previa' }).click();
  const download = page.getByRole('button', { name: mobile ? 'Descargar' : 'Descargar PDF' });
  await download.click();
  await expect(page.getByText('Sin internet. Conéctate para asignar el número.')).toBeVisible();

  // Online once: the counter assigns it. From then on its PDF works offline.
  await context.setOffline(false);
  const first = page.waitForEvent('download');
  await download.click();
  await first;
  const number = `EST-${DAY}-01`;
  await context.setOffline(true);
  const offline = page.waitForEvent('download');
  await download.click();
  const path = info.outputPath('offline.pdf');
  await (await offline).saveAs(path);
  const text = pdfText(path);
  expect(text).toContain('$18,356.75');
  expect(text).toContain(number);
  await context.setOffline(false);
  await expectNoErrors(errors);
});
