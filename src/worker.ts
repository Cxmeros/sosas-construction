/**
 * The only server code: a document-number counter (SPEC §5). It stores type, day and last
 * sequence — never customer data. Everything else is static assets; only /api/* reaches here
 * (`run_worker_first` in wrangler.jsonc).
 */
import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { counterDay, formatDocNumber, parseDocNumber, type Prefix } from './domain/numbering';

const PREFIXES = ['EST', 'INV'] as const satisfies readonly Prefix[];
type Latest = Record<Prefix, string | null>;

/** One instance for the whole business: phone and PC share it. */
export class Contador extends DurableObject<Env> {
  private readonly sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS contador (
         tipo TEXT NOT NULL, fecha TEXT NOT NULL, ultimo INTEGER NOT NULL,
         PRIMARY KEY (tipo, fecha))`,
    );
  }

  /** Next number of today (Pennsylvania), marked as used. */
  siguiente(tipo: Prefix): string {
    const fecha = counterDay(new Date());
    const { ultimo } = this.sql
      .exec<{ ultimo: number }>(
        `INSERT INTO contador (tipo, fecha, ultimo) VALUES (?, ?, 1)
         ON CONFLICT (tipo, fecha) DO UPDATE SET ultimo = ultimo + 1
         RETURNING ultimo`,
        tipo,
        fecha,
      )
      .one();
    return formatDocNumber(tipo, fecha, ultimo);
  }

  /** Last number handed out per type, from any day. */
  ultimos(): Latest {
    const latest: Latest = { EST: null, INV: null };
    for (const tipo of PREFIXES) {
      const row = this.sql
        .exec<{ fecha: string; ultimo: number }>(
          'SELECT fecha, ultimo FROM contador WHERE tipo = ? AND ultimo > 0 ORDER BY fecha DESC LIMIT 1',
          tipo,
        )
        .toArray()[0];
      latest[tipo] = row ? formatDocNumber(tipo, row.fecha, row.ultimo) : null;
    }
    return latest;
  }

  /** A hand-typed number: only ever raises that day's counter. */
  registrar(tipo: Prefix, fecha: string, secuencia: number): void {
    this.sql.exec(
      `INSERT INTO contador (tipo, fecha, ultimo) VALUES (?, ?, ?)
       ON CONFLICT (tipo, fecha) DO UPDATE SET ultimo = MAX(ultimo, excluded.ultimo)`,
      tipo,
      fecha,
      secuencia,
    );
  }

  /** Manual fix for one day; may lower it. */
  fijar(tipo: Prefix, fecha: string, ultimo: number): void {
    this.sql.exec(
      'INSERT OR REPLACE INTO contador (tipo, fecha, ultimo) VALUES (?, ?, ?)',
      tipo,
      fecha,
      ultimo,
    );
  }

  borrarTodo(): void {
    this.sql.exec('DELETE FROM contador');
  }
}

const tipoSchema = z.enum(PREFIXES);
const numeroBody = z.object({ tipo: tipoSchema });
const registrarBody = z.object({ numero: z.string().max(30) });
const fijarBody = z.object({
  tipo: tipoSchema,
  fecha: z.string().regex(/^\d{6}$/),
  ultimo: z.number().int().min(0).max(9999),
});

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (error: string, status: number) => json({ error }, status);

/** Parses a small JSON body with `schema`; null on anything unexpected. */
async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  if (Number(request.headers.get('content-length') ?? 0) > 1024) return null;
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const contador = env.CONTADOR.get(env.CONTADOR.idFromName('sosas'));
    const route = `${request.method} ${pathname}`;

    switch (route) {
      case 'POST /api/numero': {
        const body = await readBody(request, numeroBody);
        if (!body) return fail('tipo debe ser EST o INV', 400);
        return json({ numero: await contador.siguiente(body.tipo) });
      }
      case 'GET /api/ultimos':
        return json(await contador.ultimos());
      case 'POST /api/registrar': {
        const body = await readBody(request, registrarBody);
        const parsed = body && parseDocNumber(body.numero);
        if (!parsed) return fail('numero debe ser EST-AAMMDD-NN o INV-AAMMDD-NN', 400);
        await contador.registrar(parsed.prefix, parsed.day, parsed.sequence);
        return json({ ok: true });
      }
      case 'POST /api/fijar': {
        const body = await readBody(request, fijarBody);
        if (!body) return fail('tipo, fecha (AAMMDD) y ultimo son obligatorios', 400);
        await contador.fijar(body.tipo, body.fecha, body.ultimo);
        return json({ ok: true });
      }
      case 'POST /api/borrar-todo':
        await contador.borrarTodo();
        return json({ ok: true });
      default:
        return fail('No existe', 404);
    }
  },
} satisfies ExportedHandler<Env>;
