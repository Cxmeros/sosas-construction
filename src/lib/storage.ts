/**
 * The ONLY module that touches browser storage (CLAUDE.md principle 7).
 *
 * What is stored on the device — this is NOT a history of documents (SPEC §4):
 *  - `draft`    the single document being edited, so it survives closing the app
 *  - `prefs`    the last deposit percentage used
 * Document numbers come from the shared counter (src/worker.ts), not from this device.
 *
 * Everything read back is validated with zod; corrupt data is discarded without breaking the app.
 */
import { z } from 'zod';
import { formValuesSchema, type FormValues } from '../domain/form';

const KEYS = {
  /** Schema version in the key: a new shape gets a new key; a draft that doesn't fit is dropped. */
  draft: 'sosa.draft.v2',
  /** Left by earlier versions (per-device counter, hand-typed numbers queue): removed on startup. */
  legacyCounters: 'sosa.counters.v1',
  legacyPending: 'sosa.pending.v1',
  prefs: 'sosa.prefs.v1',
} as const;

const draftSchema = z.object({ savedAt: z.number().int().nonnegative(), values: formValuesSchema });
export type Draft = z.infer<typeof draftSchema>;

const prefsSchema = z.object({ depositPercent: z.string().max(10) });
type Prefs = z.infer<typeof prefsSchema>;
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
  remove(KEYS.legacyPending);
  return read(KEYS.draft, draftSchema);
}

export function saveDraft(values: FormValues, now = Date.now()): void {
  write(KEYS.draft, { savedAt: now, values } satisfies Draft);
}

export function clearDraft(): void {
  remove(KEYS.draft);
}

export function loadPrefs(): Prefs {
  return read(KEYS.prefs, prefsSchema) ?? DEFAULT_PREFS;
}

export function savePrefs(prefs: Prefs): void {
  write(KEYS.prefs, prefs);
}
