# Despliegue: Cloudflare Workers + Cloudflare Access

Cloudflare Workers sirve la carpeta `dist/` y un Worker pequeño solo para `/api/*`: el contador
central de números (`src/worker.ts`, Durable Object SQLite `Contador`; SPEC §5). El contador guarda
tipo, día y último número, nunca datos del cliente. La configuración está en
[`wrangler.jsonc`](../wrangler.jsonc). La cuenta de Cloudflare, el
repositorio y el dominio deben quedar **a nombre de Danilo** (o con acceso de administrador para
él) — SPEC §8.

## 1. Crear el Worker conectado a GitHub

1. Cloudflare → **Workers & Pages** → **Create application** → **Get started** junto a
   **Import a repository** → elige la cuenta de GitHub y el repo `sosas-construction`.
2. Configura:

   | Campo                     | Valor                                                                      |
   | ------------------------- | -------------------------------------------------------------------------- |
   | **Project name**          | `sosas-construction` (debe ser igual a `name` en `wrangler.jsonc`)         |
   | **Build command**         | `pnpm build`                                                               |
   | **Deploy command**        | `npx wrangler deploy`                                                      |
   | **Preview command**       | `npx wrangler preview` (necesita el bloque `previews` de `wrangler.jsonc`) |
   | **Enable Preview builds** | activado (cada rama tiene su URL de prueba)                                |
   | **Advanced → Path**       | `/`                                                                        |
   | **API token**             | dejar que lo cree automáticamente                                          |
   | **Variables**             | ninguna                                                                    |

   La versión de Node sale de `.node-version` (22) y la de pnpm de `packageManager` en
   `package.json`.

3. **Deploy.** Queda en `https://sosas-construction.<tu-subdominio>.workers.dev`. Cada push a
   `main` vuelve a publicar (push = deploy). El primer deploy con el contador crea el Durable Object
   (migración `v1` de `wrangler.jsonc`); no hay que crear nada a mano en el panel.
4. **Comprobar el contador** (con la sesión de Access abierta en ese navegador):
   - Abrir `/api/ultimos` → `{"EST":null,"INV":null}` o los últimos números.
   - Para dejarlo en cero después de probar, en la consola del navegador (F12) estando en la app:
     `await fetch('/api/borrar-todo', { method: 'POST' }).then((r) => r.json())`
   - Ajustar un día a mano (puede bajar):
     `await fetch('/api/fijar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'EST', fecha: '261021', ultimo: 3 }) }).then((r) => r.json())`

> Si el repo no tuviera `wrangler.jsonc`, Cloudflare correría su "configuración automática", que
> instala su plugin de Vite y cambia scripts de `package.json`. Con el archivo en el repo no lo hace.

Antes de activar Access, comprueba los headers de seguridad:

```sh
curl -sI https://sosas-construction.<tu-subdominio>.workers.dev | grep -i -E 'content-security|strict-transport|x-content'
```

## 2. Cloudflare Access (que solo entre Danilo)

**Obligatorio antes de entregar:** `/api/fijar` y `/api/borrar-todo` no tienen protección propia;
Access con **All traffic** las protege junto con todo el sitio.

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

**Aparatos que ya tenían la app:** el service worker abre la copia guardada sin pasar por
Cloudflare, así que Access no pide el código al abrir. Igual no pueden pedir números ni actualizar
(eso sí pasa por Access). Para limpiar uno: borrar los datos del sitio o desinstalar la app.

**Sesión vencida:** al pedir un número la app dice "Tu sesión venció…" con el botón **Entrar**, que
guarda el borrador y abre `/entrar` (ruta que el service worker no sirve de su caché, para que
Access pida el código); al volver, el formulario sigue igual.

El interruptor **Protect with Cloudflare Access** de la pantalla de creación hace lo mismo que el
paso 1; si Zero Trust aún no está activado, usa la pestaña **Access** después del deploy.

## 3. Instalar en el teléfono

- **iPhone (Safari):** abrir la URL → Compartir → **Agregar a inicio**.
- **Android (Chrome):** abrir la URL → menú ⋮ → **Instalar app**.

Después de la primera carga funciona sin internet (incluido crear el PDF). Cuando publicas una
versión nueva, la app la descarga en segundo plano y muestra **"Hay una versión nueva de la app"**
con el botón **Actualizar** (guarda el borrador y recarga). La app revisa si hay versión nueva cada
vez que vuelve a primer plano.

## 4. Probar localmente como en Cloudflare

```sh
pnpm build
npx wrangler@4.151.3 dev --port 8787    # dist/ + el contador real (/api/*), como en Cloudflare
```

Con `pnpm dev` (Vite), `/api` se reenvía a `:8787`, así que deja `wrangler dev` corriendo en otra
terminal. Los e2e (`pnpm test:e2e`) usan un contador falso (`mockCounter` en `e2e/helpers.ts`) y no
necesitan el Worker. Si cambias `wrangler.jsonc`, regenera los tipos: `npx wrangler@4.151.3 types`.

## 5. Antes de entregar (M6)

- Probar 2–3 trabajos reales en el teléfono de Danilo: llenar, Ver PDF, Compartir por WhatsApp.
- Modo avión: abrir la app y generar un PDF.
- Proteger `/api/fijar` y `/api/borrar-todo` (Access activo en **All traffic**, sección 2).
- Dejar el contador en cero (`/api/borrar-todo`) después de las pruebas.

## Notas técnicas

- `html_handling: "none"` en `wrangler.jsonc`: por defecto Cloudflare redirige `/index.html` → `/`
  (307), y el service worker necesita guardar `index.html` tal cual para funcionar offline.
- `not_found_handling: "single-page-application"`: cualquier otra ruta devuelve `index.html`.
- `run_worker_first: ["/api/*"]`: sin esto `/api/*` devolvería `index.html` en vez de llegar al
  Worker. El resto de rutas nunca ejecuta el Worker.
- El service worker no cachea `/api/*` ni `/entrar` (`navigateFallbackDenylist` en
  `vite.config.ts`).
- `public/_headers` se copia a `dist/` y Cloudflare lo aplica (CSP, HSTS, caché del service worker).
