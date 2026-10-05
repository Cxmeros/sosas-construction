# Brief para Claude Design

Adjunta en Claude Design: `assets/logo-placeholder.png` (logo provisional, fondo blanco)
y el PDF `ESTIMADO_SOSAS`. Luego pega este prompt:

---

Diseña la interfaz de una app web (PWA) para **Sosa's Constructions**, un contratista de
pisos de madera en Pennsylvania. La usa el dueño **tanto en celular como en computadora, por igual** (en obra y en casa), para llenar un formulario y generar un PDF de **Work Estimate** o **Invoice** que
manda al cliente por WhatsApp o correo. La interfaz va en **español**; el PDF en **inglés**.

**Identidad:** parte del logo adjunto (madera clara y oscura, café, texto dorado) y del
naranja del formato actual. Debe sentirse de oficio y madera, sólido y confiable, no como
un SaaS genérico. Alto contraste: se usa al sol.

**Pantallas a diseñar**
1. **Formulario — celular (375 px)**, un solo scroll en secciones: tipo de documento
   (Estimate / Invoice), número y fecha, cliente, descripción del trabajo, partidas,
   anticipo, términos. Barra inferior fija con el **Total** en vivo y el botón "Ver PDF".
2. **Partidas en celular:** cada partida como bloque editable (descripción, cantidad,
   unidad, precio, monto calculado). La unidad "lump sum" oculta cantidad y precio y pide
   solo el monto. Agregar, eliminar con deshacer, reordenar.
3. **Anticipo:** botones 20 % / 30 % / otro / monto fijo / sin anticipo, mostrando el
   monto del anticipo y el saldo. En Invoice cambia a "Anticipo recibido" y "Saldo a pagar".
4. **Vista previa y compartir — celular:** PDF a pantalla completa, botones "Compartir",
   "Descargar", "Convertir en Invoice" (solo en estimates) y "Nuevo documento".
5. **Escritorio (1280 px):** formulario a la izquierda y vista previa del PDF en vivo a la
   derecha; partidas como tabla.
6. **Plantilla del PDF** (carta 8.5×11), versión Estimate y versión Invoice. Conserva la
   estructura del formato actual pero mejórala: corrige "COSTUMER" → "CUSTOMER", tabla con
   columnas Description | Qty | Unit | Unit price | Amount, bloque de totales a la derecha
   (Total, Deposit, Balance), términos, "Page X of Y". Sin línea de TAX.
7. **Estados:** formulario vacío, errores de validación junto al campo, borrador recuperado.

**Datos reales para los mockups:** usa el estimate adjunto (4 partidas, total $18,356.75,
anticipo 30 % = $5,507.03, saldo $12,849.72) con un cliente inventado.

**Requisitos:** botones de mínimo 48 px, teclado numérico en cantidades y precios, foco de
teclado visible, contraste AA, textos cortos y claros. Nada de tipografías remotas en el
entregable final: indica qué fuentes usar para empaquetarlas.

Entrega también un pequeño sistema de tokens (colores hex, tipografías, espaciado, radios)
para pasárselo al desarrollador.
