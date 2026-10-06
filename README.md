# Sosa's Constructions — Estimates e Invoices

PWA 100 % client-side para llenar un formulario y obtener un PDF de **Work Estimate** o
**Invoice**. Requisitos en [`SPEC.md`](SPEC.md), reglas del proyecto en [`CLAUDE.md`](CLAUDE.md)
y el diseño original de Claude Design en [`design/`](design/).

## Comandos

```sh
pnpm install
pnpm dev          # desarrollo
pnpm build        # build de producción (dist/)
pnpm preview      # sirve dist/ con los mismos headers que producción (public/_headers)
pnpm test         # unit (Vitest) — los tests de PDF necesitan pdftotext (poppler-utils)
pnpm test:e2e     # e2e (Playwright, 375 px y 1280 px) contra el build de producción
pnpm lint
pnpm typecheck
```

Si el Chromium instalado no coincide con la versión de Playwright, usa
`PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chrome pnpm test:e2e`.

## Estructura

| Carpeta                      | Qué hay                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `src/config/company.ts`      | Datos fijos de la empresa y colores de marca                               |
| `src/domain/`                | Tipos, schema zod del formulario, cálculos en centavos, numeración (puro)  |
| `src/pdf/`                   | Modelo del PDF, paginación, `DocumentPdf.tsx` (react-pdf) y su gemelo HTML |
| `src/features/document-form` | Formulario, partidas, anticipo, borrador automático                        |
| `src/features/preview/`      | Vista previa, compartir / descargar                                        |
| `src/lib/storage.ts`         | Único módulo que toca localStorage (borrador, contador, preferencias)      |
| `src/assets/`                | Logo (`logo-placeholder.png`, reemplazable) y fuentes Barlow (SIL OFL)     |

## Notas de implementación

- **Vista previa = PDF.** `src/pdf/layout.ts` decide los saltos de página una sola vez; la vista
  previa en HTML (`PageView.tsx`) y el PDF real (`DocumentPdf.tsx`) usan las mismas páginas.
  Nunca se parte una fila, el encabezado de la tabla se repite y totales + términos van juntos.
- **Nota gris en partidas:** en la descripción, lo que va después de `—` (o `--`) se imprime
  debajo en gris, p. ej. `Refinish steps and handrails — 15 steps, 10 sticks`.
- **Compartir:** Web Share API con el archivo. Si el aparato no puede compartir archivos, se abre un
  panel con WhatsApp / correo del cliente (descarga el PDF para adjuntarlo) y "Descargar PDF".
- **CSP:** `script-src` incluye `'wasm-unsafe-eval'` porque react-pdf usa Yoga (WebAssembly).
  Yoga intenta cargar su WASM con `fetch()` de una URL `data:`; `connect-src 'self'` lo bloquea
  (verás ese error en la consola) y Yoga cae automáticamente a decodificarlo en memoria, así que no
  hace falta abrir `connect-src`. Nada requiere `'unsafe-inline'`: los estilos dinámicos de React
  se aplican por CSSOM, que la CSP no restringe.
- **Numeración:** `EST|INV-YYYYMMDD-NN`, secuencia diaria por dispositivo. El número se reserva al
  crear el documento y se guarda con el borrador, así reabrir la app no gasta números.

- **PWA:** vite-plugin-pwa precachea todo (incluido react-pdf y las fuentes), así que tras la
  primera visita funciona offline. El service worker se registra con `/registerSW.js` (sin
  scripts inline) y el manifiesto se pide con credenciales para funcionar detrás de Cloudflare
  Access. Íconos en `public/`, generados a partir del emblema del logo sobre blanco.

## Despliegue

Pasos para Cloudflare Pages y Cloudflare Access en [`docs/DEPLOY.md`](docs/DEPLOY.md).
