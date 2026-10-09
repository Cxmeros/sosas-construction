import { useRef } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { emptyExtra, type FormExtra, type FormValues } from '../../domain/form';
import { LIMITS } from '../../domain/limits';
import { formatCents, parseMoneyToCents } from '../../domain/money';
import type { DocumentData } from '../../domain/types';
import { PlusIcon, TrashIcon } from '../../ui/Icons';
import { Switch } from '../../ui/Switch';
import { removedLabel, useUndoRemove } from '../../ui/useUndoRemove';
import { errorAt, Field, invalidProps, Section, SectionTitle } from './fields';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

/** Invoice only (design 1c): charges that came up during the job. Off = kept, not printed. */
export function ExtrasSection({ form, desktop, n }: { form: Form; desktop: boolean; n: string }) {
  const { control, register, watch, setValue, formState, setFocus } = form;
  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: 'extras',
    keyName: 'key',
  });
  const on = watch('extrasOn');
  const extras = watch('extras');
  const addButton = useRef<HTMLButtonElement>(null);
  const undo = useUndoRemove<FormExtra>((index, x) => {
    insert(Math.min(index, fields.length), x);
  }, addButton);
  const sum = extras.reduce((cents, x) => cents + (parseMoneyToCents(x.amount) ?? 0), 0);
  const err = (i: number, f: keyof FormExtra) =>
    errorAt(formState.errors, `extras.${String(i)}.${f}`);

  const add = () => {
    const i = fields.length;
    append(emptyExtra(), { shouldFocus: false });
    setTimeout(() => {
      setFocus(`extras.${i}.description`);
    }, 0);
  };

  return (
    <Section desktop={desktop}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SectionTitle n={n} aside={on ? formatCents(sum) : undefined}>
            Cargos extra
          </SectionTitle>
        </div>
        <Switch
          checked={on}
          onChange={(v) => {
            setValue('extrasOn', v, { shouldDirty: true });
            if (v && fields.length === 0) add();
          }}
          label="Incluir cargos extra en el PDF"
        />
      </div>
      {!on && (
        <span className="-mt-1.5 text-[15px] text-ink-muted">
          No sale en el invoice. Actívalo si hubo trabajo extra.
        </span>
      )}
      {on && (
        <>
          {fields.map((field, i) => (
            <div
              key={field.key}
              className="flex flex-col gap-3 border border-line bg-surface p-3"
              aria-label={`Cargo ${String(i + 1)}`}
              role="group"
            >
              <div className="flex items-start gap-2">
                <Field
                  label="Concepto"
                  path={`extras.${String(i)}.description`}
                  error={err(i, 'description')}
                  className="flex-1"
                >
                  <input
                    maxLength={LIMITS.extraDescription}
                    placeholder="ej. Debris disposal"
                    className="field"
                    {...invalidProps(`extras.${String(i)}.description`, err(i, 'description'))}
                    {...register(`extras.${i}.description`)}
                  />
                </Field>
                <button
                  type="button"
                  aria-label={`Quitar cargo ${String(i + 1)}`}
                  onClick={() => {
                    const x = extras[i];
                    if (!x) return;
                    remove(i);
                    undo.offer(i, x, removedLabel(x.description, `Cargo #${String(i + 1)}`));
                  }}
                  className="mt-[27px] grid size-12 flex-none place-items-center text-error hover:bg-error-bg"
                >
                  <TrashIcon />
                </button>
              </div>
              <Field label="Monto $" path={`extras.${String(i)}.amount`} error={err(i, 'amount')}>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={LIMITS.numericInput}
                  className="field num"
                  {...invalidProps(`extras.${String(i)}.amount`, err(i, 'amount'))}
                  {...register(`extras.${i}.amount`)}
                />
              </Field>
            </div>
          ))}
          <button
            ref={addButton}
            type="button"
            onClick={add}
            disabled={fields.length >= LIMITS.maxExtras}
            className="btn-cond flex min-h-[52px] items-center justify-center gap-2 rounded-field border-[1.5px] border-walnut-700 bg-surface text-xl text-walnut-700 hover:bg-cream disabled:opacity-50"
          >
            <PlusIcon /> Agregar cargo
          </button>
          {undo.toast(desktop)}
        </>
      )}
    </Section>
  );
}
