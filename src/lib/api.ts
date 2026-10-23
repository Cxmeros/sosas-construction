/**
 * Calls to the shared document counter (src/worker.ts). Only a type or a number is ever sent —
 * never customer data (SPEC §4).
 */
import { z } from 'zod';
import type { Prefix } from '../domain/numbering';

/**
 * offline: no connection · session: Cloudflare Access wants a new login · rejected: the server
 * refused the input (400) · failed: anything else.
 */
export type ApiProblem = 'offline' | 'session' | 'rejected' | 'failed';
export type ApiResult<T> = { ok: true; value: T } | { ok: false; reason: ApiProblem };

const numberText = z.string().max(30);
const numeroResponse = z.object({ numero: numberText });

async function call<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<ApiResult<T>> {
  if (!navigator.onLine) return { ok: false, reason: 'offline' };
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
      cache: 'no-store',
      // An expired Access session answers with a redirect to its login page; following it
      // cross-origin would fail like a lost connection, so it's caught here instead.
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, reason: 'offline' };
  }
  if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403)
    return { ok: false, reason: 'session' };
  if (res.status === 400) return { ok: false, reason: 'rejected' };
  if (!res.ok) return { ok: false, reason: 'failed' };
  try {
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Page the service worker never serves from its cache (vite.config.ts), so opening it goes
 * through Cloudflare Access and its login; the app then loads there as usual.
 */
export const LOGIN_PATH = '/entrar';

/** Next number of the day for `tipo`; it counts as used. */
export async function requestNumber(tipo: Prefix): Promise<ApiResult<string>> {
  const res = await call('/api/numero', numeroResponse, { tipo });
  return res.ok ? { ok: true, value: res.value.numero } : res;
}
