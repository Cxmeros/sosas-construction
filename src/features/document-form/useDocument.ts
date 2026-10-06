import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { emptyForm, documentSchema, toLenientDocument, type FormValues } from '../../domain/form';
import { counterKey, formatDocNumber, toIsoDate } from '../../domain/numbering';
import { DEFAULT_TERMS } from '../../domain/terms';
import type { DocType, DocumentData } from '../../domain/types';
import {
  clearDraft,
  loadDraft,
  loadPrefs,
  nextSequence,
  saveDraft,
  type Draft,
} from '../../lib/storage';

function allocateNumber(type: DocType, isoDate: string): string {
  return formatDocNumber(type, isoDate, nextSequence(counterKey(type, isoDate)));
}

function freshForm(): FormValues {
  const today = toIsoDate(new Date());
  return emptyForm(
    'estimate',
    allocateNumber('estimate', today),
    today,
    loadPrefs().depositPercent,
  );
}

function hasContent(values: FormValues): boolean {
  return values.customer.name.trim() !== '' || values.items.length > 0;
}

interface Initial {
  values: FormValues;
  /** A saved draft with content, offered back to the user on open. */
  recovered: Draft | null;
}

function initialState(): Initial {
  const draft = loadDraft();
  if (draft) return { values: draft.values, recovered: hasContent(draft.values) ? draft : null };
  const values = freshForm();
  // Saved right away so reopening the app reuses this number instead of taking a new one.
  saveDraft(values);
  return { values, recovered: null };
}

const AUTOSAVE_MS = 600;

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
  const numbers = useRef<Partial<Record<DocType, string>>>({
    [initial.values.type]: initial.values.number,
  });

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
      // Swap the number only while it is still the auto-generated one.
      if (current.number === numbers.current[current.type]) {
        const number = numbers.current[type] ?? allocateNumber(type, toIsoDate(new Date()));
        numbers.current[type] = number;
        setValue('number', number, opts);
      }
      if (current.terms.trim() === DEFAULT_TERMS[current.type])
        setValue('terms', DEFAULT_TERMS[type], opts);
      if (type === 'estimate') setValue('estimateRef', '', opts);
      setValue('type', type, opts);
    },
    [getValues, setValue, form.formState.isSubmitted],
  );

  /** SPEC §3.9: keeps customer and items; changes number, type, date and terms. */
  const convertToInvoice = useCallback(() => {
    const current = getValues();
    const today = toIsoDate(new Date());
    const number = allocateNumber('invoice', today);
    numbers.current = { invoice: number };
    const values: FormValues = {
      ...current,
      type: 'invoice',
      number,
      date: today,
      estimateRef: current.type === 'estimate' ? current.number : current.estimateRef,
      terms: DEFAULT_TERMS.invoice,
    };
    reset(values);
    persist(values);
    return number;
  }, [getValues, reset, persist]);

  const newDocument = useCallback(() => {
    clearDraft();
    const values = freshForm();
    saveDraft(values);
    numbers.current = { [values.type]: values.number };
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
    convertToInvoice,
    newDocument,
  };
}

export type DocumentState = ReturnType<typeof useDocument>;
