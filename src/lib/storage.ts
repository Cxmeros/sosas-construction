/**
 * The ONLY module that touches browser storage (CLAUDE.md principle 7).
 *
 * What is stored on the device — this is NOT a history of documents (SPEC §4):
 *  - `draft`    the single document being edited, so it survives closing the app
 *  - `pending`  hand-typed document numbers not yet reported to the shared counter (offline);
 *               numbers only, never customer data
 *  - `prefs`    the last deposit percentage used
 * Document numbers come from the shared counter (src/worker.ts), not from this device.
 *
 * Everything read back is validated with zod; corrupt data is discarded without breaking the app.
 */
import { z } from 'zod';
import { formValuesSchema, type FormValues } from '../domain/form';

const KEYS = {
  /** Schema version in the key: a new shape gets a new key plus a migration from the old one. */
  draft: 'sosa.draft.v2',
  draftV1: 'sosa.draft.v1',
  /** Old per-device counter, replaced by the shared one: removed on startup. */
  legacyCounters: 'sosa.counters.v1',
  pending: 'sosa.pending.v1',
  prefs: 'sosa.prefs.v1',
} as const;

const draftSchema = z.object({ savedAt: z.number().int().nonnegative(), values: formValuesSchema });
export type Draft = z.infer<typeof draftSchema>;

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

/**
 * v1 → v2: items gain `detail` (taken from the old "description — detail" convention), and the
 * new extras / work-process fields start empty. Also accepts the short-lived 1–3 options shape
 * (keeps the first option). Anything that still doesn't validate is dropped by `read`.
 */
export function migrateDraftV1(raw: unknown): unknown {
  const draft = record(raw);
  const values = record(draft.values);
  const options = Array.isArray(values.options) ? values.options : null;
  const items: unknown[] = options
    ? ((record(options[0]).items as unknown[] | undefined) ?? [])
    : Array.isArray(values.items)
      ? values.items
      : [];
  const rest = { ...values };
  delete rest.options;
  return {
    ...draft,
    values: {
      ...rest,
      items: items.map((item) => {
        const i = record(item);
        const text = typeof i.description === 'string' ? i.description : '';
        const [description = '', detail = ''] = text.split(/\s+(?:—|–|--)\s+/);
        return { ...i, description, detail };
      }),
      extrasOn: false,
      extras: [],
      processOn: false,
      processNote: '',
      steps: [],
    },
  };
}

const pendingSchema = z.array(z.string().max(30)).max(50);

const prefsSchema = z.object({ depositPercent: z.string().max(10) });
export type Prefs = z.infer<typeof prefsSchema>;
const DEFAULT_PREFS: Prefs = { depositPercent: '30' };

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const raw = store()?.getItem(key);
    if (raw == null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    store()?.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the app keeps working, only persistence is lost.
  }
}

function remove(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // ignore
  }
}

export function loadDraft(): Draft | null {
  remove(KEYS.legacyCounters);
  const current = read(KEYS.draft, draftSchema);
  if (current) return current;
  const old = read(KEYS.draftV1, z.unknown());
  if (old === null) return null;
  remove(KEYS.draftV1);
  const parsed = draftSchema.safeParse(migrateDraftV1(old));
  if (!parsed.success) return null;
  write(KEYS.draft, parsed.data);
  return parsed.data;
}

export function saveDraft(values: FormValues, now = Date.now()): void {
  write(KEYS.draft, { savedAt: now, values } satisfies Draft);
}

export function clearDraft(): void {
  remove(KEYS.draft);
  remove(KEYS.draftV1);
}

/** Hand-typed numbers waiting for a connection to reach /api/registrar. */
export function loadPending(): string[] {
  return read(KEYS.pending, pendingSchema) ?? [];
}

export function savePending(numbers: string[]): void {
  if (numbers.length === 0) remove(KEYS.pending);
  else write(KEYS.pending, [...new Set(numbers)].slice(-50));
}

export function loadPrefs(): Prefs {
  return read(KEYS.prefs, prefsSchema) ?? DEFAULT_PREFS;
}

export function savePrefs(prefs: Prefs): void {
  write(KEYS.prefs, prefs);
}
