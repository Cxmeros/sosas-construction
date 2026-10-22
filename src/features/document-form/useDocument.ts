import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  emptyForm,
  documentSchema,
  toAmountOnly,
  toEstimateItem,
  toInvoiceValues,
  toLenientDocument,
  type FormValues,
} from '../../domain/form';
import { parseDocNumber, PREFIX, toIsoDate } from '../../domain/numbering';
import { DEFAULT_TERMS } from '../../domain/terms';
import type { DocType, DocumentData } from '../../domain/types';
import {
  fetchLatest,
  registerNumber,
  requestNumber,
  type ApiResult,
  type Latest,
} from '../../lib/api';
import {
  clearDraft,
  loadDraft,
  loadPending,
  loadPrefs,
  savePending,
  saveDraft,
  type Draft,
} from '../../lib/storage';

/** No number yet: the shared counter assigns it on the first preview (SPEC §5). */
function freshForm(): FormValues {
  return emptyForm('estimate', '', toIsoDate(new Date()), loadPrefs().depositPercent);
}

/** A number the counter handed out for `type` (so switching type must not keep it). */
const isCounterNumber = (number: string, type: DocType) =>
  parseDocNumber(number)?.prefix === PREFIX[type];

/**
 * Reports hand-typed numbers so the counter never hands them out again. Offline ones wait in
 * storage until the connection is back. Numbers in another format are not the counter's business.
 */
async function flushPending(extra?: string): Promise<boolean> {
  const queue = [...loadPending(), ...(extra && parseDocNumber(extra) ? [extra] : [])];
  if (queue.length === 0) return false;
  const left: string[] = [];
  for (const number of new Set(queue)) {
    const res = await registerNumber(number);
    if (!res.ok && res.reason !== 'rejected') left.push(number);
  }
  savePending(left);
  return left.length < queue.length;
}

/** Something the user actually typed; a blank item row alone doesn't count. */
function hasContent(values: FormValues): boolean {
  return (
    values.customer.name.trim() !== '' ||
    values.jobDescription.trim() !== '' ||
    values.items.some((i) =>
      [i.description, i.qty, i.unitPrice, i.lumpSum].some((v) => v.trim() !== ''),
    )
  );
}

interface Initial {
  values: FormValues;
  /** A saved draft with content, offered back to the user on open. */
  recovered: Draft | null;
}

function initialState(): Initial {
  const loaded = loadDraft();
  // Invoice drafts from before amount-only items get their items collapsed too.
  const draft =
    loaded?.values.type === 'invoice'
      ? { ...loaded, values: { ...loaded.values, items: loaded.values.items.map(toAmountOnly) } }
      : loaded;
  if (draft) return { values: draft.values, recovered: hasContent(draft.values) ? draft : null };
  return { values: freshForm(), recovered: null };
}

/** SPEC §3.10: autosave about every 2 s while typing. */
const AUTOSAVE_MS = 2000;

export function useDocument() {
  const [initial] = useState(initialState);
  const [recovered, setRecovered] = useState(initial.recovered);
  const [savedAt, setSavedAt] = useState<number | null>(initial.recovered?.savedAt ?? null);

  const form = useForm<FormValues, unknown, DocumentData>({
    defaultValues: initial.values,
    resolver: zodResolver(documentSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const { getValues, setValue, reset, watch } = form;

  /** Numbers already handed out for this document, so toggling the type doesn't burn numbers. */
  const numbers = useRef<Partial<Record<DocType, string>>>(
    initial.values.number ? { [initial.values.type]: initial.values.number } : {},
  );

  /** Last numbers on the shared counter ("Último: INV-261021-03"); null offline. */
  const [latest, setLatest] = useState<Latest | null>(null);
  const refreshLatest = useCallback(() => {
    void fetchLatest().then((res) => {
      setLatest(res.ok ? res.value : null);
    });
  }, []);

  useEffect(() => {
    const sync = () => {
      void flushPending().then(refreshLatest);
    };
    sync();
    window.addEventListener('online', sync);
    return () => {
      window.removeEventListener('online', sync);
    };
  }, [refreshLatest]);

  // Autosave the draft (the document in progress — not a history, SPEC §4).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = watch(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const now = Date.now();
        saveDraft(getValues(), now);
        setSavedAt(now);
      }, AUTOSAVE_MS);
    });
    return () => {
      clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [watch, getValues]);

  const persist = useCallback((values: FormValues) => {
    const now = Date.now();
    saveDraft(values, now);
    setSavedAt(now);
  }, []);

  const setType = useCallback(
    (type: DocType) => {
      const current = getValues();
      if (current.type === type) return;
      const opts = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
      // A counter number of the old type gives way to this type's (or none yet: the next preview
      // asks for one). Hand-typed numbers in other formats stay.
      if (isCounterNumber(current.number, current.type)) {
        numbers.current[current.type] = current.number;
        setValue('number', numbers.current[type] ?? '', opts);
      }
      if (current.terms.trim() === DEFAULT_TERMS[current.type])
        setValue('terms', DEFAULT_TERMS[type], opts);
      if (type === 'estimate') setValue('estimateRef', '', opts);
      setValue(
        'items',
        current.items.map(type === 'invoice' ? toAmountOnly : toEstimateItem),
        opts,
      );
      setValue('type', type, opts);
    },
    [getValues, setValue, form.formState.isSubmitted],
  );

  /** The estimate as it was before the last conversion, so "Deshacer" can bring it back. */
  const beforeConvert = useRef<{ values: FormValues; numbers: typeof numbers.current } | null>(
    null,
  );

  /** SPEC §3.9 (rules in `toInvoiceValues`): needs a new INV- number, so it needs the network. */
  const convertToInvoice = useCallback(async (): Promise<ApiResult<string>> => {
    const res = await requestNumber('INV');
    if (!res.ok) return res;
    const current = getValues();
    beforeConvert.current = { values: current, numbers: { ...numbers.current } };
    numbers.current = { invoice: res.value };
    const values = toInvoiceValues(current, res.value, toIsoDate(new Date()));
    reset(values);
    persist(values);
    refreshLatest();
    return res;
  }, [getValues, reset, persist, refreshLatest]);

  /** One request at a time: a double tap on "Vista previa" must not take two numbers. */
  const inFlight = useRef<Promise<ApiResult<string>> | null>(null);

  /**
   * The document's number, asking the shared counter the first time. A number already in the
   * field (assigned before or typed by hand) is reused and reported to the counter.
   */
  const ensureNumber = useCallback((): Promise<ApiResult<string>> => {
    const typed = getValues('number').trim();
    if (typed) {
      void flushPending(typed).then((changed) => {
        if (changed) refreshLatest();
      });
      return Promise.resolve({ ok: true, value: typed });
    }
    inFlight.current ??= (async () => {
      const type = getValues('type');
      const res = await requestNumber(PREFIX[type]);
      if (res.ok && getValues('type') === type && !getValues('number').trim()) {
        numbers.current[type] = res.value;
        setValue('number', res.value, { shouldDirty: true });
        persist(getValues());
        refreshLatest();
      }
      inFlight.current = null;
      return res.ok ? { ok: true as const, value: getValues('number').trim() || res.value } : res;
    })();
    return inFlight.current;
  }, [getValues, setValue, persist, refreshLatest]);

  const undoConvert = useCallback(() => {
    const before = beforeConvert.current;
    if (!before) return;
    beforeConvert.current = null;
    numbers.current = before.numbers;
    reset(before.values);
    persist(before.values);
  }, [reset, persist]);

  const newDocument = useCallback(() => {
    clearDraft();
    const values = freshForm();
    numbers.current = {};
    beforeConvert.current = null;
    reset(values);
    setRecovered(null);
    setSavedAt(null);
  }, [reset]);

  const values = watch();
  const doc = toLenientDocument(values);

  return {
    form,
    values,
    doc,
    savedAt,
    recovered,
    keepRecovered: () => {
      setRecovered(null);
    },
    setType,
    latest,
    ensureNumber,
    convertToInvoice,
    undoConvert,
    newDocument,
  };
}

export type DocumentState = ReturnType<typeof useDocument>;
