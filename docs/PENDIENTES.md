# Pendientes — rama `feat/client-feedback-oct`

Estado al 8 oct 2026. Los 10 puntos de la reunión están implementados. Pasaron `/simplify` y
`/code-review`, y los hallazgos importantes ya están corregidos. Esto es lo que falta.

## 1. Datos que tiene que mandar el cliente
- [ ] **Color rojo exacto** (código HEX o una foto buena de la camisa). Ahora es provisional
      `#8E1D24`. Cambiarlo en `src/config/company.ts` (`brand*`) y en `src/styles.css`
      (`--color-brand-*`). `pnpm test` revisa que coincidan y que el contraste siga en AA.
- [ ] **Logo oficial** en PNG de alta resolución. Pasos en el README, sección "Cambiar el logo".
      Hay que regenerar también los íconos de `public/`.
- [ ] **¿Cuál teléfono es de Carlos y cuál de Danilo?** El PDF original pone
      `435-512-4801` y `208-600-7776` juntos bajo DANILO SOSA. Hoy salen los dos sin nombre.
- [ ] **Texto de los pasos por defecto** ("Pasos del proceso"). `DEFAULT_STEPS` está vacío en
      `src/domain/terms.ts`. Si lo mandan, se pone ahí, o Danilo lo guarda desde la app con
      "Guardar como predeterminado".
- [ ] **Numeración con dos dueños**: cada celular cuenta por su lado, así que Danilo y Carlos
      pueden sacar el mismo `EST-…-01` el mismo día. Opciones: un prefijo por persona
      (`EST-D-…` / `EST-C-…`) o que solo uno emita. Hay que decidirlo con ellos.
- [ ] **Correos de Danilo y Carlos** para Cloudflare Access (`docs/DEPLOY.md`).
- [ ] **¿Les gusta la franja de madera?** Está lista y apagada (`FEATURES.woodHeader`, +7 KB).
      Para mostrarla, ponerla en `true`.
- [ ] **Bug de la fecha**: no lo pude reproducir en Chromium. Hay que preguntar en qué celular
      y en qué navegador pasó (¿iPhone/Safari?) y probarlo ahí.

## 2. Para continuar mañana (técnico)
- [ ] Revisar y unir el PR de esta rama (o pedir cambios).
- [ ] Probar en un celular real (iPhone Safari y Android Chrome): selector de fecha, compartir
      el PDF y la franja de madera encendida.
- [ ] Desplegar en Cloudflare y revisar la CSP con `pnpm build && pnpm preview`.

## 3. Hallazgos de la revisión que quedaron sin hacer (a propósito)
- [ ] **Números que ya se usaron en días pasados**: la versión anterior solo guardaba el
      contador de hoy. Si Danilo pone una fecha de un día en el que ya emitió documentos *antes*
      de esta versión, la cuenta de ese día empieza otra vez en 01 y puede repetir un número.
      Desde esta versión se guardan los últimos 100 contadores. La solución completa va junto con
      la decisión de numeración del punto 1.
- [ ] Mover la fecha con las flechas del teclado aparta un número por cada día que pasa. Se
      reutilizan si vuelve a un día ya visto. No se repiten números, solo quedan huecos.
- [ ] Los cargos extra se suman a todas las opciones. Hoy no afecta, porque un invoice solo
      puede tener una opción (la validación lo exige). Si las opciones vuelven a activarse,
      revisar `src/pdf/model.ts`.
- [ ] Refactor grande opcional: en el modelo del PDF, que una "tabla" sea un concepto propio
      (columnas + filas), en vez de la bandera `simpleTable` y las filas `kind: 'extra'`.
- [ ] Usar `.default()` en el schema del borrador en lugar de agregar una línea de migración
      por cada campo nuevo (`src/lib/storage.ts`).
- [ ] Juntar el código repetido de "agregar fila y enfocar" (ItemsEditor, OptionsEditor,
      ExtrasEditor) y una clase `.btn-outline` común.

## 4. Fuera de esta versión
- [ ] **Opciones en el estimate (1–3)**: el código está completo y probado, pero apagado con
      `FEATURES.estimateOptions = false`. Los tests e2e de opciones se saltan mientras esté apagado.
