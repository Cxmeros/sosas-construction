# Despliegue: Cloudflare Pages + Cloudflare Access

La cuenta de Cloudflare, el repositorio y el dominio deben quedar **a nombre de Danilo**
(o con acceso de administrador para él) — SPEC §8.

## 1. Cloudflare Pages

1. Sube el repositorio a GitHub (cuenta de Danilo o con él como admin).
2. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → elige el repo.
3. Configuración de build:
   - **Framework preset:** None
   - **Build command:** `pnpm build`
   - **Build output directory:** `dist`
   - La versión de Node sale de `.node-version` (22) y la de pnpm de `packageManager` en
     `package.json`.
4. **Save and Deploy.** Queda en `https://<proyecto>.pages.dev`.
5. (Opcional) **Custom domains** → agrega el dominio, p. ej. `estimates.sosasconstructions.com`.

`public/_headers` se copia a `dist/` y Cloudflare aplica la CSP y demás headers. Para comprobarlo:

```sh
curl -sI https://<proyecto>.pages.dev | grep -i -E 'content-security|strict-transport|x-content'
```

## 2. Cloudflare Access (solo los correos de Danilo)

1. Cloudflare → **Zero Trust** (el plan Free alcanza hasta 50 usuarios). La primera vez pide un
   nombre de equipo (`<equipo>.cloudflareaccess.com`).
2. **Settings → Authentication → Login methods**: deja **One-time PIN** (código por email).
3. **Access → Applications → Add an application → Self-hosted**:
   - **Application name:** Sosa Estimates
   - **Session duration:** 1 month (para no pedir código en cada obra; la app funciona offline
     igual cuando la sesión vence)
   - **Public hostname:** el dominio propio, o `<proyecto>.pages.dev`.
     Agrega otro hostname `*.<proyecto>.pages.dev` para cubrir también las vistas previas de cada
     deploy.
4. **Policies → Add a policy**:
   - **Action:** Allow
   - **Include → Emails:** los correos de Danilo (uno por línea).
5. Guarda. Abre la URL en una ventana privada: debe pedir el correo y luego el código.

> Si se usa dominio propio, en **Workers & Pages → proyecto → Settings → General** activa
> **Access policy** para las vistas previas (`*.pages.dev`), o agrega esos hostnames a la misma
> aplicación de Access (paso 3).

## 3. Instalar en el teléfono

- **iPhone (Safari):** abrir la URL → Compartir → **Agregar a inicio**.
- **Android (Chrome):** abrir la URL → menú ⋮ → **Instalar app**.

Después de la primera carga funciona sin internet (incluido crear el PDF). Cuando publicas una
versión nueva, la app la descarga en segundo plano y muestra **"Hay una versión nueva de la app"**
con el botón **Actualizar** (guarda el borrador y recarga). La app revisa si hay versión nueva cada
vez que vuelve a primer plano.

## 4. Antes de entregar (M6)

- Probar 2–3 trabajos reales en el teléfono de Danilo: llenar, Ver PDF, Compartir por WhatsApp.
- Modo avión: abrir la app y generar un PDF.
- Reemplazar `src/assets/logo-placeholder.png` por el logo en alta resolución (y regenerar los
  íconos de `public/` si cambia el emblema).
