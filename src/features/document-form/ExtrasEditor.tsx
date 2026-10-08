import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { emptyExtra, type FormValues } from '../../domain/form';
import { LIMITS } from '../../domain/limits';
import type { DocumentData } from '../../domain/types';
import { PlusIcon, TrashIcon } from '../../ui/Icons';
import { errorAt, Field, invalidProps, Section, SectionTitle } from './fields';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

/** Invoice-only extra charges (SPEC §3.7c): description + amount, added to the total. */
export function ExtrasEditor({ form, desktop }: { form: Form; desktop: boolean }) {
  const { control, register, formState, setFocus, clearErrors } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'extras', keyName: 'key' });
  const err = (path: string) => errorAt(formState.errors, path);

  const add = () => {
    const n = fields.length;
    append(emptyExtra(), { shouldFocus: false });
    setTimeout(() => {
      clearErrors(`extras.${n}`);
      setFocus(`extras.${n}.description`);
    }, 0);
  };

  return (
    <Section desktop={desktop}>
      <SectionTitle n="4b">Cargos extra</SectionTitle>
      <span className="text-sm text-ink-muted">
        Opcional: cobros sueltos sin cantidad, ej. “Debris disposal” $50. Se suman al total y salen
        en el PDF (en inglés).
      </span>
      {fields.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {fields.map((field, i) => {
            const d = `extras.${i}.description` as const;
            const a = `extras.${i}.amount` as const;
            return (
              <li
                key={field.key}
                aria-label={`Cargo extra ${String(i + 1)}`}
                className={
                  desktop
                    ? 'grid grid-cols-[minmax(0,1fr)_160px_48px] items-start gap-3'
                    : 'flex flex-col gap-3 border border-line bg-surface p-3'
                }
              >
                <Field label="Descripción" path={d} error={err(d)}>
                  <input
                    maxLength={LIMITS.extraDescription}
                    placeholder="ej. Debris disposal"
                    className="field"
                    {...invalidProps(d, err(d))}
                    {...register(d)}
                  />
                </Field>
                <div className={desktop ? 'contents' : 'flex items-end gap-2'}>
                  <Field label="Monto $" path={a} error={err(a)} className="flex-1">
                    <input
                      inputMode="decimal"
                      autoComplete="off"
                      maxLength={LIMITS.numericInput}
                      className="field num"
                      {...invalidProps(a, err(a))}
                      {...register(a)}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => {
                      remove(i);
                    }}
                    aria-label={`Quitar cargo extra ${String(i + 1)}`}
                    className={`grid size-12 flex-none place-items-center text-error hover:bg-error-bg ${desktop ? 'mt-[27px]' : ''}`}
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {fields.length < LIMITS.maxExtras && (
        <button
          type="button"
          onClick={add}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-field border-[1.5px] border-walnut-700 bg-surface px-4 font-semibold text-walnut-700 hover:bg-cream ${desktop ? 'self-start text-base' : 'text-[17px]'}`}
        >
          <PlusIcon size={20} /> Agregar cargo extra
        </button>
      )}
    </Section>
  );
}
