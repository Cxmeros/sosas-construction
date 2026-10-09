import { useRef, useState } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { emptyStep, type FormStep, type FormValues } from '../../domain/form';
import { LIMITS } from '../../domain/limits';
import type { DocumentData } from '../../domain/types';
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from '../../ui/Icons';
import { Switch } from '../../ui/Switch';
import { removedLabel, useUndoRemove } from '../../ui/useUndoRemove';
import { errorAt, Field, invalidProps, Section, SectionTitle } from './fields';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

/** "1,180 / 1,500" once the text reaches 80 % of its limit (SPEC §3.13). */
function Counter({ value, max }: { value: string; max: number }) {
  if (value.length < max * 0.8) return null;
  return (
    <span
      className={`self-end text-sm font-semibold tabular-nums ${value.length >= max ? 'text-error' : 'text-ink-muted'}`}
    >
      {value.length.toLocaleString('en-US')} / {max.toLocaleString('en-US')}
    </span>
  );
}

/**
 * Estimate only (design 1b): optional step-by-step plan, written in English for the customer.
 * Off = kept in the draft, not printed. "Ordenar" swaps the list for big ↑↓ arrows.
 */
export function ProcessSection({ form, desktop, n }: { form: Form; desktop: boolean; n: string }) {
  const { control, register, watch, setValue, formState, setFocus } = form;
  const { fields, append, remove, insert, move } = useFieldArray({
    control,
    name: 'steps',
    keyName: 'key',
  });
  const on = watch('processOn');
  const steps = watch('steps');
  const note = watch('processNote');
  const [mode, setMode] = useState<'edit' | 'order'>('edit');
  const [open, setOpen] = useState<number | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const undo = useUndoRemove<FormStep>((index, step) => {
    insert(Math.min(index, fields.length), step);
  }, addButton);
  const titleError = (i: number) => errorAt(formState.errors, `steps.${String(i)}.title`);

  const add = () => {
    const i = fields.length;
    append(emptyStep(), { shouldFocus: false });
    setMode('edit');
    setOpen(i);
    setTimeout(() => {
      setFocus(`steps.${i}.title`);
    }, 0);
  };

  return (
    <Section desktop={desktop}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SectionTitle n={n}>Pasos del proceso</SectionTitle>
        </div>
        <Switch
          checked={on}
          onChange={(v) => {
            setValue('processOn', v, { shouldDirty: true });
          }}
          label="Incluir pasos en el PDF"
        />
      </div>
      {!on && (
        <span className="-mt-2 text-[15px] text-ink-muted">
          {steps.length
            ? 'Apagado: los pasos se guardan pero no salen en el PDF.'
            : 'Opcional: explica al cliente el trabajo paso a paso, en una hoja aparte del PDF.'}
        </span>
      )}
      {on && (
        <>
          <Field
            label="Nota inicial para el cliente (opcional)"
            path="processNote"
            error={undefined}
          >
            <textarea
              rows={4}
              maxLength={LIMITS.processNote}
              placeholder="e.g. Assumptions, what happens if we find damage…"
              className="field font-normal"
              {...register('processNote')}
            />
            <Counter value={note} max={LIMITS.processNote} />
          </Field>
          <div
            role="radiogroup"
            aria-label="Modo de la lista"
            className="grid grid-cols-2 border-[1.5px] border-walnut-700"
          >
            {(
              [
                ['edit', 'Editar texto'],
                ['order', 'Ordenar'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => {
                  setMode(value);
                  setOpen(null);
                }}
                className={`min-h-12 text-base font-semibold ${mode === value ? 'bg-walnut-700 text-white' : 'bg-surface text-walnut-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {fields.map((field, i) => {
              const step = steps[i] ?? field;
              const num = (
                <span className="w-8 flex-none font-cond text-2xl leading-none font-bold text-red-700 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
              );
              return (
                <li
                  key={field.key}
                  className="border-b border-dashed border-line"
                  aria-label={`Paso ${String(i + 1)}`}
                >
                  {mode === 'order' ? (
                    <div className="flex min-h-[60px] items-start gap-1.5 py-1.5">
                      <span className="pt-2">{num}</span>
                      <span className="min-w-0 flex-1 py-1.5 text-base leading-snug">
                        {step.title || <em className="text-ink-muted">Sin título</em>}
                      </span>
                      <button
                        type="button"
                        aria-label={`Subir paso ${String(i + 1)}`}
                        disabled={i === 0}
                        onClick={() => {
                          move(i, i - 1);
                        }}
                        className="grid size-12 place-items-center text-walnut-700 hover:bg-cream disabled:opacity-30"
                      >
                        <UpIcon size={24} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar paso ${String(i + 1)}`}
                        disabled={i === fields.length - 1}
                        onClick={() => {
                          move(i, i + 1);
                        }}
                        className="grid size-12 place-items-center text-walnut-700 hover:bg-cream disabled:opacity-30"
                      >
                        <DownIcon size={24} />
                      </button>
                    </div>
                  ) : open === i || titleError(i) ? (
                    <div className="-mx-2 my-2 flex flex-col gap-3 border-[1.5px] border-walnut-700 bg-surface p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-cond text-xl font-bold text-red-700 uppercase">
                          Paso {i + 1} de {fields.length}
                        </span>
                        <button
                          type="button"
                          aria-label="Cerrar paso"
                          onClick={() => {
                            setOpen(null);
                          }}
                          className="grid size-12 place-items-center text-walnut-700 hover:bg-cream"
                        >
                          <UpIcon size={24} />
                        </button>
                      </div>
                      <Field
                        label="Título del paso"
                        path={`steps.${String(i)}.title`}
                        error={titleError(i)}
                      >
                        <input
                          maxLength={LIMITS.stepTitle}
                          placeholder="e.g. Protect the work area"
                          enterKeyHint="next"
                          className="field"
                          {...invalidProps(`steps.${String(i)}.title`, titleError(i))}
                          {...register(`steps.${i}.title`)}
                        />
                        <Counter value={step.title} max={LIMITS.stepTitle} />
                      </Field>
                      <Field
                        label="Explicación para el cliente (opcional)"
                        path={`steps.${String(i)}.body`}
                        error={undefined}
                      >
                        <textarea
                          rows={desktop ? 5 : 9}
                          maxLength={LIMITS.stepBody}
                          placeholder="What you'll do, with which materials, and what the customer should know"
                          className="field font-normal"
                          {...register(`steps.${i}.body`)}
                        />
                        <Counter value={step.body} max={LIMITS.stepBody} />
                      </Field>
                      <div className="grid grid-cols-[auto_1fr] gap-2">
                        <button
                          type="button"
                          aria-label={`Quitar paso ${String(i + 1)}`}
                          onClick={() => {
                            const s = steps[i];
                            if (!s) return;
                            remove(i);
                            setOpen(null);
                            undo.offer(i, s, removedLabel(s.title, `Paso #${String(i + 1)}`));
                          }}
                          className="grid size-12 place-items-center border-[1.5px] border-error text-error hover:bg-error-bg"
                        >
                          <TrashIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (i < fields.length - 1) setOpen(i + 1);
                            else setOpen(null);
                          }}
                          className="min-h-12 rounded-field bg-red-700 text-base font-bold text-white hover:bg-red-800"
                        >
                          {i < fields.length - 1 ? 'Siguiente paso' : 'Listo'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Editar paso ${String(i + 1)}`}
                      onClick={() => {
                        setOpen(i);
                      }}
                      className="flex w-full items-start gap-2.5 py-3 text-left hover:bg-cream"
                    >
                      {num}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <strong className="text-base leading-tight">
                          {step.title || <em className="font-normal text-ink-muted">Sin título</em>}
                        </strong>
                        {step.body && (
                          <span className="truncate text-sm text-ink-muted">{step.body}</span>
                        )}
                      </span>
                      <span className="flex-none pt-0.5 text-sm font-semibold text-walnut-700 underline underline-offset-4">
                        Editar
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <button
            ref={addButton}
            type="button"
            onClick={add}
            disabled={fields.length >= LIMITS.maxSteps}
            className="btn-cond flex min-h-[52px] items-center justify-center gap-2 rounded-field border-[1.5px] border-walnut-700 bg-surface text-xl text-walnut-700 hover:bg-cream disabled:opacity-50"
          >
            <PlusIcon /> Agregar paso
          </button>
          {fields.length >= LIMITS.maxSteps && (
            <span className="text-sm text-ink-muted">Máximo {LIMITS.maxSteps} pasos.</span>
          )}
          {undo.toast(desktop)}
        </>
      )}
    </Section>
  );
}
