# Sosa's Constructions — Generador de Estimates / Invoices

Lee `SPEC.md` completo antes de cualquier tarea. Si algo de este archivo o del SPEC
contradice lo que te pido en un prompt, detente y pregunta.

## Qué es
PWA (web instalable) para que un contratista llene un formulario desde el celular o la
computadora y obtenga un PDF de Work Estimate o Invoice listo para enviar.

## Principios no negociables
1. **100 % client-side.** Sin backend, sin base de datos, sin cuentas, sin APIs propias.
   Los datos del cliente final nunca salen del dispositivo salvo dentro del PDF que el
   usuario decide compartir.
2. **Cero código de terceros en runtime.** Sin analytics, sin CDNs, sin Google Fonts
   remotas. Fuentes y logo van empaquetados en el build.
3. **Dinero en centavos enteros.** Nunca floats para montos. Formatear solo al mostrar con
   `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
   Cantidades con hasta 2 decimales se guardan como enteros en centésimas.
   `amountCents = Math.round(qtyHundredths * unitPriceCents / 100)` (todos positivos → half-up).
4. **Validación con Zod** en el borde formulario → modelo. Límite de longitud en todo texto.
5. **TypeScript strict**, sin `any`, sin `@ts-ignore`.
6. Prohibido: `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML`.
7. Un único módulo (`src/lib/storage.ts`) toca localStorage/IndexedDB, siempre con try/catch
   y validando con Zod lo que lee (los datos guardados pueden estar corruptos).

## Stack (versiones exactas, lockfile commiteado)
- pnpm, Vite, React 18, TypeScript strict
- Tailwind CSS
- react-hook-form + zod (+ @hookform/resolvers)
- @react-pdf/renderer — cargado con `import()` dinámico al generar/previsualizar
- vite-plugin-pwa (instalable, funciona offline)
- Vitest (unit) + Playwright (e2e, viewports 375px y 1280px)
- ESLint + Prettier
- Deploy: Cloudflare Pages detrás de Cloudflare Access

No agregues dependencias fuera de esta lista sin explicar por qué y pedir confirmación.

## Estructura
```
src/
  config/company.ts        datos fijos de la empresa (nombre, dirección, teléfonos, colores)
  domain/                  tipos, schemas zod, cálculos, numeración — puro, sin React, 100 % testeado
  pdf/                     DocumentPdf.tsx, estilos, registro de fuentes
  features/document-form/  formulario, partidas, depósito, términos
  features/preview/        vista previa + compartir/descargar
  lib/storage.ts           borrador, contador, preferencias
  assets/                  logo (PNG alta resolución o SVG), fuentes .ttf
public/_headers            headers de seguridad para Cloudflare Pages
```

## Comandos
`pnpm dev` · `pnpm build` · `pnpm test` · `pnpm test:e2e` · `pnpm lint` · `pnpm typecheck`

## Headers de seguridad (`public/_headers`)
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
```
Si @react-pdf/renderer necesita WASM, agregar **solo** `'wasm-unsafe-eval'` a script-src,
nunca `'unsafe-eval'`. Si algo exige `'unsafe-inline'` en style-src, documenta por qué.
Verifica la CSP con `pnpm build && pnpm preview` usando los mismos headers, no solo en dev.

## Definition of Done (cada tarea)
- typecheck, lint, unit y e2e pasan
- toda lógica nueva en `domain/` tiene tests
- revisado en 375px y 1280px, foco de teclado visible, contraste AA
- `pnpm audit --prod` sin vulnerabilidades high/critical
- commit pequeño con mensaje descriptivo (Conventional Commits)

## Idioma
- Interfaz: español (texto simple, sin tecnicismos).
- PDF: inglés.
- Código, nombres de variables y commits: inglés.
