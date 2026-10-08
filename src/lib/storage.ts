/**
 * The ONLY module that touches browser storage (CLAUDE.md principle 7).
 *
 * What is stored on the device — this is NOT a history of documents (SPEC §4):
 *  - `draft`    the single document being edited, so it survives closing the app
 *  - `counters` today's sequence per prefix, for EST-/INV- numbering
 *  - `prefs`    the last deposit percentage used
 *
 * Everything read back is validated with zod; corrupt data is discarded without breaking the app.
 */
import { z } from 'zod';
import { formValuesSchema, type FormValues } from '../domain/form';
import { LIMITS } from '../domain/limits';

const KEYS = {
  draft: 'sosa.draft.v1',
  counters: 'sosa.counters.v1',
  prefs: 'sosa.prefs.v1',
} as const;

/**
 * Older drafts: before options they kept a flat `items` list (wrapped as one option); before
 * invoice extra charges they had no `extras` (an empty list).
 */
function migrateDraftValues(values: unknown): unknown {
  if (!values || typeof values !== 'object') return values;
  let migrated: Record<string, unknown> = { ...values };
  if (!('options' in migrated) && 'items' in migrated) {
    const { items, ...rest } = migrated;
    migrated = { ...rest, options: [{ id: 'option-1', title: '', description: '', items }] };
  }
  if (!('extras' in migrated)) migrated.extras = [];
  if (!('steps' in migrated)) migrated.steps = '';
  return migrated;
}

const draftSchema = z.object({
  savedAt: z.number().int().nonnegative(),
  values: z.preprocess(migrateDraftValues, formValuesSchema),
});
export type Draft = z.infer<typeof draftSchema>;

/** Only the current day is kept: `{ "EST-20261005": 2, "INV-20261005": 1 }`. */
const countersSchema = z.record(z.string().max(20), z.number().int().nonnegative().max(9999));

const prefsSchema = z.object({
  depositPercent: z.string().max(10),
  /** Work-process steps new documents start with (SPEC §3.7b); absent until Danilo saves some. */
  defaultSteps: z.string().max(LIMITS.stepsText).optional(),
});
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
  return read(KEYS.draft, draftSchema);
}

export function saveDraft(values: FormValues, now = Date.now()): void {
  write(KEYS.draft, { savedAt: now, values } satisfies Draft);
}

export function clearDraft(): void {
  remove(KEYS.draft);
}

/** Returns the next sequence for `key` (e.g. "EST-20261005") and records it. */
export function nextSequence(key: string): number {
  const counters = read(KEYS.counters, countersSchema) ?? {};
  const next = (counters[key] ?? 0) + 1;
  const day = key.slice(-8);
  // Drop other days so the record stays tiny.
  const kept = Object.fromEntries(Object.entries(counters).filter(([k]) => k.endsWith(day)));
  write(KEYS.counters, { ...kept, [key]: next });
  return next;
}

export function loadPrefs(): Prefs {
  return read(KEYS.prefs, prefsSchema) ?? DEFAULT_PREFS;
}

/** Updates only the given preferences, keeping the rest. */
export function savePrefs(prefs: Partial<Prefs>): void {
  write(KEYS.prefs, { ...loadPrefs(), ...prefs });
}
