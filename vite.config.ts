/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Parses public/_headers (Cloudflare Pages format, single `/*` block). */
function readHeaders(): Record<string, string> {
  const lines = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8').split('\n');
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const match = /^\s+([\w-]+):\s*(.+)$/.exec(line);
    if (match?.[1] && match[2]) headers[match[1]] = match[2].trim();
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
  plugins: [react(), tailwindcss(), productionHeaders()],
  build: { assetsInlineLimit: 0 },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
