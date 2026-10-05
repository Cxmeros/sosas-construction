# # Sosa's Constructions PWA

_Started 2026-10-05 17:49 UTC_

---

## User

Diseña la interfaz de una app web (PWA) para Sosa's Constructions, un contratista de pisos de madera en Pennsylvania. El dueño la usa tanto en celular como en computadora, por igual (en obra y en casa), para llenar un formulario y generar un PDF de Work Estimate o Invoice que manda al cliente por WhatsApp o correo. Interfaz en español.

Identidad: parte del logo adjunto (madera clara y oscura, café, dorado) y del naranja del formato actual (PDF adjunto). Debe sentirse de oficio y madera, sólido y confiable, no como un SaaS genérico. Alto contraste, porque se usa al sol. El logo es PNG con fondo blanco: no lo pongas sobre fondos de color.

Pantallas:
1. Formulario en celular (375 px), un solo scroll por secciones: tipo de documento (Estimate / Invoice), número y fecha, cliente (nombre, dirección, teléfono, email), descripción del trabajo, partidas, anticipo y términos. Barra inferior fija con el Total en vivo y el botón "Ver PDF".
2. Partidas en celular: cada una como bloque editable con descripción, cantidad, unidad (sq ft, linear ft, steps, each, hours, lump sum, other), precio y monto calculado. "Lump sum" oculta cantidad y precio y pide solo el monto; "other" pide escribir la unidad. Agregar, eliminar con opción de deshacer y reordenar.
3. Anticipo: botones 20 % / 30 % / otro % / monto fijo / sin anticipo, mostrando el anticipo y el saldo. En Invoice cambia a "Anticipo recibido" y "Saldo a pagar".
4. Vista previa y compartir en celular: PDF a pantalla completa con botones "Compartir", "Descargar", "Convertir en Invoice" (solo en estimates) y "Nuevo documento".
5. Escritorio (1280 px): formulario a la izquierda, vista previa del PDF en vivo a la derecha y partidas como tabla.
6. Estados: formulario vacío, errores de validación junto al campo y aviso de borrador recuperado.

Datos de los mockups: usa las partidas del PDF adjunto (total $18,356.75; anticipo 30 % = $5,507.03; saldo $12,849.72) con un cliente inventado.

Requisitos: botones de al menos 48 px, teclado numérico en cantidades y precios, foco visible, contraste AA y textos cortos y claros. Usa fuentes que se puedan empaquetar localmente, nada cargado desde internet.

Entrega también un sistema de tokens (colores en hex, tipografías, escala de texto, espaciado, radios) para el desarrollador.

## Assistant

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_skill_prompt]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: view_image]_

_[tool: copy_files]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_html_str_replace]_

_[tool: show_html]_

_[tool: ready_for_verification]_

Las pantallas están en **Sosa App.dc.html** y la plantilla del PDF en **Sosa PDF.dc.html**. Todavía se están revisando.

- **Interactivos:** el celular 1a y el escritorio 5a comparten datos. Puedes editar partidas, cambiar la unidad, mover partidas con ↑↓ (arrastrando en escritorio), eliminar con "Deshacer", elegir el anticipo, cambiar Estimate/Invoice y tocar "Ver PDF", que abre la vista previa con "Convertir en Invoice" y "Nuevo documento".
- **Pantallas fijas:** 2a muestra lump sum, other, deshacer y reordenar. 3a compara el anticipo en Estimate y en Invoice. 4a y 4b son las vistas previas y el panel de compartir. 6a, 6b y 6c son los estados (vacío, errores y borrador recuperado). En 7 están los tokens: 20 colores en hex, tipografía, espaciado y radios.
- **Estilo:** tomé la estructura del sistema de diseño Industry (esquinas rectas, marcas "+", títulos en Barlow Condensed), pero cambié el azul acero por los colores de la madera y el naranja de Sosa's, como pediste.
- **Contraste:** en botones y barras uso un naranja más oscuro (#B5470F), porque el naranja de tu formato actual (#E06A1F) no da contraste suficiente con texto blanco pequeño. Ese naranja original queda solo para líneas. El logo siempre va sobre blanco.
- **Fuentes:** Barlow y Barlow Condensed tienen licencia libre (SIL OFL) y se pueden empaquetar localmente. En este boceto todavía se cargan desde internet; el desarrollador debe incluir los archivos .woff2 en la app.
- **PDF:** corregí "COSTUMER" a "CUSTOMER". La tabla tiene las columnas Description | Qty | Unit | Unit price | Amount, con Total, Deposit y Balance a la derecha.
- **Cliente inventado:** Margaret Kelly, Lansdowne, PA. Los montos coinciden con tu PDF: total $18,356.75, anticipo 30 % de $5,507.03 y saldo de $12,849.72.

## User

Ahora diseña la plantilla del PDF, tamaño carta (8.5×11 in), en dos versiones: Work Estimate e Invoice. Usa los mismos tokens de la app. El PDF va en inglés.

Conserva la estructura del formato actual adjunto, pero mejórala:
- Encabezado con el logo a la izquierda; a la derecha el título "WORK ESTIMATE" o "INVOICE", número (ej. EST-20261005-01) y fecha MM-DD-YYYY.
- Datos de la empresa: Danilo Sosa, 29 E Providence Rd, Lansdowne, PA 19050, 435-512-4801, 208-600-7776.
- "CUSTOMER INFORMATION" (el original dice COSTUMER por error).
- Job description.
- Tabla: Description | Qty | Unit | Unit price | Amount. Incluye una partida lump sum ("Refinish steps and handrails — 15 steps, 10 sticks — $3,000.00").
- Totales a la derecha. Estimate: Total, Deposit required (30 %), Balance due upon completion. Invoice: Total, Deposit received, Balance due.
- Terms & conditions. Estimate: "This is an estimate, not a quote or contract. It covers the work described above based on the information provided and may be modified due to additional information or unforeseen conditions." Invoice: "Payment is due upon receipt. Thank you for your business."
- Pie con "Page X of Y". Muestra también cómo se ve la tabla si pasa a una segunda página (se repite el encabezado de la tabla).
- Sin línea de TAX.

Que se vea profesional y limpio impreso en blanco y negro también.

## Assistant

_[tool: dc_write]_

_[tool: dc_js_str_replace]_

Now align the app's PDF data (numbering, labels, terms) with the template.

_[tool: run_script]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: list_files]_

Files exist; likely a transient load failure. Retrying.

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

It renders in the user's view; my preview iframe had a stale load. Capturing the user's view to check the layout.

_[tool: screenshot_user_view]_

_[tool: ready_for_verification]_

Las plantillas del PDF ya están en **Sosa PDF Templates.dc.html**; todavía se están revisando. Usan los mismos tokens de la app y están en inglés.

- **A · Work Estimate:** cada sección lleva lo que pediste. La partida lump sum aparece como "Refinish steps and handrails" con la nota "15 steps, 10 sticks" debajo y $3,000.00. Los totales coinciden: $18,356.75, anticipo de $5,507.03 y saldo de $12,849.72.
- **B · Invoice:** muestra "Deposit received" con el anticipo en negativo y "Balance due". Debajo de la fecha incluye la referencia al estimate del que viene.
- **C · Dos páginas:** un estimate largo que corta la tabla al final de la página 1 con "Continued on page 2 →" y el subtotal de esa página. La página 2 tiene un encabezado reducido, repite el encabezado de la tabla y lleva los totales y términos. El pie dice "Page X of Y".
- **D · Blanco y negro:** las dos versiones en escala de grises, para comprobar que se leen bien impresas.

La plantilla es la misma que usa la vista previa de la app, así que el número (EST-AAAAMMDD-NN), las etiquetas y los términos ya cambian también ahí. No agregué línea de firma ("Accepted by"); dime si la quieres en el estimate.

