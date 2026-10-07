# SPEC — Generador de Estimates / Invoices para Sosa's Constructions

## 1. Problema
Danilo Sosa (contratista de pisos en Lansdowne, PA) hace sus estimates y facturas editando
un Word: el formato se mueve, tiene que buscar el archivo cada vez y borrar a mano.
Quiere llenar campos y obtener un PDF listo para mandar al cliente.

## 2. Decisiones
### Confirmadas por el cliente
- **Sin TAX.** No existe línea de impuestos.
- **Sin historial.** La app no guarda documentos generados; el PDF es el registro.
- **Línea de anticipo (deposit)**, porcentaje elegible (típico 20–30 %).
- **Celular y computadora por igual** → responsive, ambos tamaños con la misma prioridad.
- **Estimate e Invoice**, mismo formato; cambian título, numeración, depósito y términos.
- **Sin métodos de pago impresos.** El invoice lleva un texto de términos genérico y editable.
- **Logo:** se usa `assets/logo-placeholder.png` (extraído del PDF, 525×245 px, fondo blanco).
  Va en un solo lugar (`src/assets/`) para reemplazarlo sin tocar código.
- **No hay más ejemplos de trabajos.** Las unidades deben ser flexibles (ver §3.5).

### Supuestos
- PDF en inglés, interfaz en español.
- Usuarios: 1–2 personas.

## 3. Alcance
### MVP
1. Tipo de documento: Estimate | Invoice.
2. Número de documento autogenerado y editable; fecha (hoy por defecto, formato MM-DD-YYYY).
3. Datos del cliente: nombre (requerido), dirección, teléfono, email (opcionales).
4. Job description (texto libre, máx. 1 500 caracteres).
5. Partidas (1–30):
   - description (req., máx. 200), qty, unit, unit price, amount (calculado).
   - Units: `sq ft`, `linear ft`, `steps`, `each`, `hours`, `lump sum` y **`other`** (texto libre,
     máx. 15 caracteres) porque no tenemos más ejemplos de sus trabajos.
   - `lump sum`: no pide qty ni unit price; se escribe el monto directo.
     (Caso real: "Refinish step and handrails — 15 steps, 10 sticks — $3,000".)
   - Agregar, eliminar (con deshacer), reordenar.
6. Deposit:
   - Estimate: ninguno | porcentaje (botones 20 % / 30 % + personalizado) | monto fijo.
     Muestra "Deposit required" y "Balance due upon completion".
   - Invoice: "Deposit received" (monto) → "Balance due".
   - El depósito nunca puede superar el total.
7. Terms & conditions: texto por defecto según tipo, editable.
8. Vista previa del PDF → **Compartir** (Web Share API con archivo: WhatsApp, Mensajes,
   correo) con respaldo a **Descargar**.
9. **"Convertir en Invoice"**: crea un invoice a partir del estimate actual conservando
   cliente y partidas (cambia número, tipo, fecha y términos).
10. **Borrador automático** del documento en curso (sobrevive a cerrar la app);
    "Nuevo documento" lo limpia previa confirmación.
11. **Opciones en el estimate** (pedido del cliente, oct 2026): de 1 a 3 opciones, cada una con
    nombre (requerido si hay 2 o más), descripción opcional, sus propias partidas (1–30) y su total.
    - El anticipo elegido se aplica al total de cada opción (monto fijo: no puede superar la opción
      más barata).
    - PDF: con 2 opciones que caben en la primera página, van lado a lado (Description | Amount, con
      "qty unit × price" en gris); si no caben o son 3, una debajo de otra con su tabla completa.
      Cada opción lleva su caja de totales.
    - "Convertir en Invoice" (o cambiar el tipo) pregunta qué opción aceptó el cliente; el invoice
      lleva solo esa. Un invoice nunca tiene más de una opción.
    - Sin fotos por ahora.

### Fase 2 (no construir aún)
- Catálogo de servicios frecuentes con precio por defecto (ej. "Install and refinish — $7.50/sq ft").
- Datos de empresa editables desde la app.

### Fuera de alcance
Cuentas, base de datos, historial, envío de correo desde servidor, pagos en línea, impuestos.

## 4. Datos que sí se guardan en el dispositivo
Esto **no** es historial y debe quedar claro en el código:
- `draft` — documento en curso (uno solo).
- `counters` — secuencia diaria para la numeración.
- `prefs` — último porcentaje de depósito usado.
Todo validado con Zod al leer; si falla, se descarta sin romper la app.

## 5. Numeración
Formato: `EST-YYYYMMDD-NN` / `INV-YYYYMMDD-NN` (NN = secuencia del día en ese dispositivo).
Se basa en fecha para minimizar choques si usa celular y computadora. Siempre editable.

## 6. Cálculos (src/domain)
- `lineAmountCents` según §CLAUDE.md principio 3; `lump sum` = monto ingresado.
- `totalCents = Σ lineAmountCents`
- `depositCents = Math.round(totalCents * pct / 100)` o monto fijo (≤ total).
- `balanceCents = totalCents − depositCents`
- Límites: qty ≤ 1 000 000; unit price ≤ $100 000; total ≤ $10 000 000; nada negativo.

### Casos de prueba obligatorios (del estimate real de ejemplo)
| Partida | Qty | Unit | Precio | Amount |
|---|---|---|---|---|
| Remove carpet and hardwood floor | 1625 | sq ft | 0.85 | $1,381.25 |
| Install and refinish | 1625 | sq ft | 7.50 | $12,187.50 |
| Refinish scraper hardwood floors | 447 | sq ft | 4.00 | $1,788.00 |
| Refinish steps and handrails (15 steps, 10 sticks) | — | lump sum | — | $3,000.00 |
- Total = **$18,356.75**
- Deposit 30 % = **$5,507.03** (5 507.025 redondeado) · Balance = **$12,849.72**
- Deposit 20 % = **$3,671.35** · Balance = **$14,685.40**

## 7. PDF
Carta (8.5×11 in), márgenes 0.75 in, texto real y seleccionable, fuentes embebidas.
Basado en el formato actual de Danilo, con correcciones:
1. Encabezado: logo a la izquierda (PNG de fondo blanco: no ponerlo sobre fondos de color); título "WORK ESTIMATE" o "INVOICE" a la derecha;
   debajo, número y fecha.
2. Bloque empresa: DANILO SOSA · 29 E Providence Rd · Lansdowne, PA 19050 ·
   435-512-4801 · 208-600-7776 (desde `config/company.ts`).
3. **CUSTOMER INFORMATION** (el original dice "COSTUMER": corregir).
4. JOB DESCRIPTION.
5. Tabla: Description | Qty | Unit | Unit price | Amount. Texto largo se envuelve;
   si hay varias páginas, se repite el encabezado de la tabla y no se parten filas.
6. Totales alineados a la derecha: Total, Deposit (con %), Balance.
7. Terms & conditions.
   - Estimate (corregido): "This is an estimate, not a quote or contract. It covers the
     work described above based on the information provided and may be modified due to
     additional information or unforeseen conditions."
   - Invoice: "Payment is due upon receipt. Thank you for your business."
     (por defecto, editable en cada documento).
8. Pie: "Page X of Y".
- Nombre del archivo: `Estimate_EST-20261005-01_John-Smith.pdf` (solo `[A-Za-z0-9_-]`).
- El diseño visual final sale del entregable de Claude Design (ver DESIGN_BRIEF.md).

## 8. Seguridad
- Superficie de ataque mínima: sitio estático, sin servidor ni datos en la nube.
- Acceso restringido con **Cloudflare Access** (OTP por email, solo los correos de Danilo):
  evita que extraños generen documentos con su logo y datos.
- CSP estricta y headers en `public/_headers` (ver CLAUDE.md).
- Dependencias fijadas, Dependabot activado, `pnpm audit` en CI.
- Todo texto del usuario va al PDF como texto plano (react-pdf no interpreta HTML).
- La cuenta de Cloudflare, el repo y el dominio quedan **a nombre del cliente**
  (o con acceso de administrador para él).

## 9. Accesibilidad y uso en campo
- Botones ≥ 48 px, `inputmode="decimal"` en cantidades y precios, `type="tel"`, `type="email"`.
- Alto contraste (se usa en exteriores con sol).
- Errores claros junto al campo, en español.
- Funciona offline después de la primera carga.

## 10. Hitos — prompts para Claude Code
Ejecuta uno a la vez; revisa y prueba antes de pasar al siguiente.
Usa modo plan (Shift+Tab) para M0, M1 y M3.

**M0 — Base**
> Lee CLAUDE.md y SPEC.md. Crea el proyecto con el stack indicado, la estructura de carpetas,
> ESLint/Prettier, Vitest, Playwright, `public/_headers` y un workflow de GitHub Actions
> (typecheck, lint, test, build, audit). Sin funcionalidad todavía. Muéstrame el plan antes.

**M1 — Dominio**
> Implementa `src/domain`: tipos, schemas Zod, cálculos en centavos, depósito, numeración.
> Escribe primero los tests con los casos de SPEC §6 y luego el código hasta que pasen.

**M2 — Formulario**
> Construye el formulario según el diseño adjunto [capturas/HTML de Claude Design],
> mobile-first, con react-hook-form + Zod, borrador automático y validaciones en español.

**M3 — PDF**
> Implementa `src/pdf/DocumentPdf.tsx` según SPEC §7 y el diseño del PDF. Agrega un test que
> genere el PDF del ejemplo de SPEC §6 y verifique por extracción de texto que aparecen
> $18,356.75, el depósito y el balance.

**M4 — Compartir y flujo**
> Vista previa, Compartir (Web Share API con File) con respaldo a descarga, "Convertir en
> Invoice", "Nuevo documento". E2E con Playwright del flujo completo en 375px y 1280px.

**M5 — PWA y despliegue**
> Configura vite-plugin-pwa (offline, ícono con el logo), verifica la CSP en build de
> producción y prepara el deploy a Cloudflare Pages. Dame los pasos para Cloudflare Access.

**M6 — Pruebas reales**
Probar en el iPhone/Android de Danilo con 2–3 trabajos reales, ajustar y entregar.
