/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Headers of the global `/*` block of public/_headers (Cloudflare Pages format). */
function readHeaders(): Record<string, string> {
  const lines = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8').split('\n');
  const headers: Record<string, string> = {};
  let inGlobal = false;
  for (const line of lines) {
    if (/^\S/.test(line)) inGlobal = line.trim() === '/*';
    const match = /^\s+([\w-]+):\s*(.+)$/.exec(line);
    if (inGlobal && match?.[1] && match[2]) headers[match[1]] = match[2].trim();
  }
  return headers;
}

/** `pnpm preview` serves the build with the same headers as production, to verify the CSP. */
function productionHeaders(): Plugin {
  return {
    name: 'production-headers',
    configurePreviewServer(server) {
      const headers = readHeaders();
      // HSTS and upgrade-insecure-requests are meaningless on http://localhost.
      delete headers['Strict-Transport-Security'];
      const csp = headers['Content-Security-Policy'];
      if (csp)
        headers['Content-Security-Policy'] = csp.replace(/;\s*upgrade-insecure-requests/, '');
      server.middlewares.use((_req, res, next) => {
        for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits until Danilo taps "Actualizar" (UpdateBar). Swapping it in silently
      // under an open page could delete the old react-pdf chunk the page still needs.
      registerType: 'prompt',
      // Registered from the bundle (src/ui/UpdateBar.tsx): no inline script, CSP-safe.
      injectRegister: false,
      // Behind Cloudflare Access the manifest request must carry the Access cookie.
      useCredentials: true,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: "Sosa's Constructions · Estimates",
        short_name: 'Sosa Estimates',
        description: 'Estimates e invoices en PDF para Sosa’s Constructions.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#2A1A10',
        background_color: '#F6F1EA',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything, including the lazily loaded react-pdf chunk and fonts, works offline.
        globPatterns: ['**/*.{js,css,html,png,woff,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    productionHeaders(),
  ],
  build: { assetsInlineLimit: 0 },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
