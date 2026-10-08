import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { computeTotals } from '../../domain/calc';
import { emptyForm, documentSchema, toLenientDocument, type FormValues } from '../../domain/form';
import { counterKey, formatDocNumber, numberForDate, toIsoDate } from '../../domain/numbering';
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
  const prefs = loadPrefs();
  return emptyForm(
    'estimate',
    allocateNumber('estimate', today),
    today,
    prefs.depositPercent,
    prefs.defaultSteps,
  );
}

/** The deposit the estimate asked for on one option, in cents, or null when there is none. */
function requestedDeposit(values: FormValues, optionIndex: number): number | null {
  const doc = toLenientDocument(values);
  const option = doc.options[optionIndex];
  if (!option) return null;
  const { depositCents } = computeTotals(option.items, doc.deposit, doc.extras);
  return depositCents > 0 ? depositCents : null;
}

/** Keeps only the option the customer accepted (an invoice has exactly one). */
function keepOption(values: FormValues, optionIndex: number): FormValues['options'] {
  const option = values.options[optionIndex] ?? values.options[0];
  return option ? [option] : values.options;
}

/** Something the user actually typed; a blank item row alone doesn't count. */
function hasContent(values: FormValues): boolean {
  return (
    values.customer.name.trim() !== '' ||
    values.jobDescription.trim() !== '' ||
    values.options.some(
      (o) =>
        o.title.trim() !== '' ||
        o.items.some((i) =>
          [i.description, i.qty, i.unitPrice, i.lumpSum].some((v) => v.trim() !== ''),
        ),
    )
  );
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

  // The automatic number carries a date (EST-YYYYMMDD-NN): keep it on the date Danilo picks, so the
  // PDF never shows one date in the number and another in DATE. A number he typed is left alone.
  useEffect(() => {
    const sub = watch((values, { name }) => {
      if (name !== 'date' || !values.type || !values.number || !values.date) return;
      if (values.number !== numbers.current[values.type]) return;
      const moved = numberForDate(values.number, values.date);
      if (!moved || moved === values.number) return;
      numbers.current[values.type] = moved;
      setValue('number', moved, { shouldDirty: true });
    });
    return () => {
      sub.unsubscribe();
    };
  }, [watch, setValue]);

  const persist = useCallback((values: FormValues) => {
    const now = Date.now();
    saveDraft(values, now);
    setSavedAt(now);
  }, []);

  /**
   * The estimate's deposit was only requested, not received. On an invoice it is never carried over
   * as money received: Danilo types what he actually got, with the requested amount as a hint.
   */
  const [depositHint, setDepositHint] = useState<number | null>(null);

  /** `optionIndex`: when switching to invoice with several options, the one the customer chose. */
  const setType = useCallback(
    (type: DocType, optionIndex = 0) => {
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
      if (type === 'estimate') {
        setValue('estimateRef', '', opts);
        setDepositHint(null);
      } else {
        if (current.options.length > 1) setValue('options', keepOption(current, optionIndex), opts);
        if (current.depositMode !== 'none' && current.depositMode !== 'fixed') {
          setDepositHint(requestedDeposit(current, optionIndex));
          setValue('depositMode', 'fixed', opts);
          setValue('depositFixed', '', opts);
        }
      }
      setValue('type', type, opts);
    },
    [getValues, setValue, form.formState.isSubmitted],
  );

  /** The estimate as it was before the last conversion, so "Deshacer" can bring it back. */
  const beforeConvert = useRef<{ values: FormValues; numbers: typeof numbers.current } | null>(
    null,
  );

  /**
   * SPEC §3.9: keeps customer and items; changes number, type, date and terms. With several
   * options, only the one the customer accepted (`optionIndex`) goes on the invoice.
   */
  const convertToInvoice = useCallback(
    (optionIndex = 0) => {
      const current = getValues();
      beforeConvert.current = { values: current, numbers: { ...numbers.current } };
      const today = toIsoDate(new Date());
      const number = allocateNumber('invoice', today);
      numbers.current = { invoice: number };
      const asked = current.depositMode !== 'none';
      setDepositHint(asked ? requestedDeposit(current, optionIndex) : null);
      const values: FormValues = {
        ...current,
        options: keepOption(current, optionIndex),
        type: 'invoice',
        number,
        date: today,
        estimateRef: current.type === 'estimate' ? current.number : current.estimateRef,
        terms: DEFAULT_TERMS.invoice,
        depositMode: asked ? 'fixed' : 'none',
        depositFixed: '',
      };
      reset(values);
      persist(values);
      return { number, askDeposit: asked };
    },
    [getValues, reset, persist],
  );

  const undoConvert = useCallback(() => {
    const before = beforeConvert.current;
    if (!before) return;
    beforeConvert.current = null;
    numbers.current = before.numbers;
    setDepositHint(null);
    reset(before.values);
    persist(before.values);
  }, [reset, persist]);

  const newDocument = useCallback(() => {
    clearDraft();
    const values = freshForm();
    saveDraft(values);
    numbers.current = { [values.type]: values.number };
    beforeConvert.current = null;
    setDepositHint(null);
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
    undoConvert,
    depositHint,
    newDocument,
  };
}

export type DocumentState = ReturnType<typeof useDocument>;
