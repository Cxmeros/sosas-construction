# Despliegue: Cloudflare Workers + Cloudflare Access

La app es un sitio estático: Cloudflare Workers sirve la carpeta `dist/` (sin código de servidor).
La configuración está en [`wrangler.jsonc`](../wrangler.jsonc). La cuenta de Cloudflare, el
repositorio y el dominio deben quedar **a nombre de Danilo** (o con acceso de administrador para
él) — SPEC §8.

## 1. Crear el Worker conectado a GitHub

1. Cloudflare → **Workers & Pages** → **Create application** → **Get started** junto a
   **Import a repository** → elige la cuenta de GitHub y el repo `sosas-construction`.
2. Configura:

   | Campo                     | Valor                                                              |
   | ------------------------- | ------------------------------------------------------------------ |
   | **Project name**          | `sosas-construction` (debe ser igual a `name` en `wrangler.jsonc`) |
   | **Build command**         | `pnpm build`                                                       |
   | **Deploy command**        | `npx wrangler deploy`                                              |
   | **Preview command**       | el que propone Cloudflare                                          |
   | **Enable Preview builds** | activado (cada rama tiene su URL de prueba)                        |
   | **Advanced → Path**       | `/`                                                                |
   | **API token**             | dejar que lo cree automáticamente                                  |
   | **Variables**             | ninguna                                                            |

   La versión de Node sale de `.node-version` (22) y la de pnpm de `packageManager` en
   `package.json`.

3. **Deploy.** Queda en `https://sosas-construction.<tu-subdominio>.workers.dev`. Cada push a
   `main` vuelve a publicar.

> Si el repo no tuviera `wrangler.jsonc`, Cloudflare correría su "configuración automática", que
> instala su plugin de Vite y cambia scripts de `package.json`. Con el archivo en el repo no lo hace.

Antes de activar Access, comprueba los headers de seguridad:

```sh
curl -sI https://sosas-construction.<tu-subdominio>.workers.dev | grep -i -E 'content-security|strict-transport|x-content'
```

## 2. Cloudflare Access (que solo entre Danilo)

Requisito: tener **Zero Trust** activado en la cuenta (Cloudflare → **Zero Trust**; el plan Free
alcanza hasta 50 usuarios). La primera vez pide un nombre de equipo.

1. **Workers & Pages** → `sosas-construction` → pestaña **Access** →
   **Protect this Worker behind Access**.
2. Elige **All traffic** (protege la URL principal y las de prueba).
3. En **Authentication policy** elige **Cloudflare account**: solo entran los miembros de esta
   cuenta de Cloudflare (Danilo).
   - ⚠️ **No uses "Email domain" con `gmail.com`** (u otro correo público): dejaría entrar a
     cualquiera con un Gmail.
4. **Apply Access.**
5. (Recomendado) Para permitir correos concretos en lugar de "miembros de la cuenta":
   **Zero Trust → Access → Applications** → abre la aplicación creada → **Policies** → edita la
   regla: **Include → Emails** con los correos de Danilo, uno por línea. Ahí mismo puedes poner
   **Session duration: 1 month** para no pedir código en cada obra (la app funciona offline igual
   cuando la sesión vence).
6. Prueba en una ventana privada: debe pedir el correo y luego un código (One-time PIN).

El interruptor **Protect with Cloudflare Access** de la pantalla de creación hace lo mismo que el
paso 1; si Zero Trust aún no está activado, usa la pestaña **Access** después del deploy.

## 3. Instalar en el teléfono

- **iPhone (Safari):** abrir la URL → Compartir → **Agregar a inicio**.
- **Android (Chrome):** abrir la URL → menú ⋮ → **Instalar app**.

Después de la primera carga funciona sin internet (incluido crear el PDF). Las actualizaciones se
instalan solas en segundo plano y se ven al volver a abrir la app.

## 4. Probar localmente como en Cloudflare

```sh
pnpm build
npx wrangler dev --port 8787            # sirve dist/ con las mismas reglas que Cloudflare
E2E_BASE_URL=http://127.0.0.1:8787 pnpm test:e2e
```

## 5. Antes de entregar (M6)

- Probar 2–3 trabajos reales en el teléfono de Danilo: llenar, Ver PDF, Compartir por WhatsApp.
- Modo avión: abrir la app y generar un PDF.
- Reemplazar `src/assets/logo-placeholder.png` por el logo en alta resolución (y regenerar los
  íconos de `public/` si cambia el emblema).

## Notas técnicas

- `html_handling: "none"` en `wrangler.jsonc`: por defecto Cloudflare redirige `/index.html` → `/`
  (307), y el service worker necesita guardar `index.html` tal cual para funcionar offline.
- `not_found_handling: "single-page-application"`: cualquier otra ruta devuelve `index.html`.
- `public/_headers` se copia a `dist/` y Cloudflare lo aplica (CSP, HSTS, caché del service worker).
