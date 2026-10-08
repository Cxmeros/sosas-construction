import { useState } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { emptyItem, emptyOption, type FormValues } from '../../domain/form';
import { FEATURES } from '../../config/company';
import { LIMITS } from '../../domain/limits';
import { formatCents } from '../../domain/money';
import type { DocumentData, Totals } from '../../domain/types';
import { ConfirmDialog } from '../../ui/Dialog';
import { PlusIcon, TrashIcon } from '../../ui/Icons';
import { errorAt, Field, FieldError, invalidProps, SectionTitle } from './fields';
import { ItemsEditor } from './ItemsEditor';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

const TITLE_EXAMPLES = ['Refinish existing hardwood floors', 'Install new hardwood flooring', ''];

/**
 * An estimate can offer 1–3 options (ways of doing the job), each with its own items and total.
 * With one option the form looks as before; "Agregar otra opción" turns it into option blocks.
 */
export function OptionsEditor({
  form,
  desktop,
  invoice,
  totals,
}: {
  form: Form;
  desktop: boolean;
  invoice: boolean;
  totals: Totals[];
}) {
  const { control, register, formState, watch, setFocus, clearErrors } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'options', keyName: 'key' });
  const options = watch('options');
  const multi = fields.length > 1;
  const [removing, setRemoving] = useState<number | null>(null);
  const err = (path: string) => errorAt(formState.errors, path);

  const add = () => {
    const n = fields.length;
    append(emptyOption([emptyItem()]), { shouldFocus: false });
    setTimeout(() => {
      // A new, untouched option is not an error yet, even after a failed "Ver PDF".
      clearErrors(`options.${n}`);
      // Going from one option to two: the first one needs a name too, so start there.
      setFocus(n === 1 && !options[0]?.title.trim() ? 'options.0.title' : `options.${n}.title`);
    }, 0);
  };

  const meta = (k: number, optional: boolean) => (
    <>
      <Field
        label={optional ? 'Nombre de la sección (opcional)' : 'Nombre de la opción'}
        path={`options.${k}.title`}
        error={err(`options.${k}.title`)}
      >
        <input
          maxLength={LIMITS.optionTitle}
          placeholder={TITLE_EXAMPLES[k] ? `ej. ${TITLE_EXAMPLES[k]}` : undefined}
          className="field"
          {...invalidProps(`options.${k}.title`, err(`options.${k}.title`))}
          {...register(`options.${k}.title`)}
        />
      </Field>
      <Field label="Qué incluye (opcional)" path={`options.${k}.description`} error={undefined}>
        <textarea
          rows={2}
          maxLength={LIMITS.optionDescription}
          className="field font-normal"
          {...register(`options.${k}.description`)}
        />
      </Field>
    </>
  );

  // Turned off: a draft that already has several options still shows (and can remove) them.
  const addButton = FEATURES.estimateOptions && !invoice && fields.length < LIMITS.maxOptions && (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={add}
        className={`flex min-h-12 items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-walnut-700 bg-surface px-4 font-semibold text-walnut-700 hover:bg-cream ${desktop ? 'self-start text-base' : 'text-[17px]'}`}
      >
        <PlusIcon size={20} />
        {multi ? `Agregar opción ${String(fields.length + 1)}` : 'Agregar otra opción'}
      </button>
      {!multi && (
        <span className="text-sm text-ink-muted">
          Para ofrecerle al cliente otra forma de hacer el trabajo, con su propio total.
        </span>
      )}
    </div>
  );

  if (!multi) {
    const only = options[0];
    // A single option only shows its name and description when it has them (e.g. the option
    // the customer accepted, now on the invoice): they print as the section heading.
    const showMeta = Boolean(only && (only.title.trim() || only.description.trim()));
    return (
      <>
        <ItemsEditor
          form={form}
          desktop={desktop}
          totalLabel={formatCents(totals[0]?.totalCents ?? 0)}
        />
        {showMeta && (
          <div className="flex flex-col gap-3 border border-line p-4">{meta(0, true)}</div>
        )}
        {addButton}
      </>
    );
  }

  const optionToRemove = removing !== null ? options[removing] : undefined;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="options-title">
      <div id="options-title">
        <SectionTitle n="04" aside={`${String(fields.length)} opciones`}>
          Opciones
        </SectionTitle>
      </div>
      <FieldError path="options" message={err('options.root') ?? err('options')} />
      {fields.map((field, k) => (
        <div
          key={field.key}
          role="group"
          aria-label={`Opción ${String(k + 1)}`}
          className="flex flex-col border-[1.5px] border-walnut-700 bg-paper"
        >
          <div className="flex items-center justify-between bg-brand-700 pl-4 text-white">
            <h3 className="btn-cond m-0 text-xl">Opción {k + 1}</h3>
            <button
              type="button"
              onClick={() => {
                setRemoving(k);
              }}
              aria-label={`Quitar opción ${String(k + 1)}`}
              className="flex min-h-12 items-center gap-1.5 px-3.5 text-[15px] font-semibold text-white hover:bg-brand-800"
            >
              <TrashIcon size={20} /> Quitar
            </button>
          </div>
          <div className={`flex flex-col gap-3 ${desktop ? 'p-4' : 'p-3'}`}>
            {desktop ? (
              <div className="grid grid-cols-2 gap-4">{meta(k, false)}</div>
            ) : (
              meta(k, false)
            )}
            <ItemsEditor
              form={form}
              desktop={desktop}
              optionIndex={k}
              multi
              totalLabel={formatCents(totals[k]?.totalCents ?? 0)}
            />
            {!desktop && (
              <div className="flex items-baseline justify-between border-t border-line pt-2.5 tabular-nums">
                <span className="text-[15px] font-semibold text-ink-muted">
                  Total opción {k + 1}
                </span>
                <span className="font-cond text-[26px] font-bold">
                  {formatCents(totals[k]?.totalCents ?? 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
      {addButton}
      <span className="text-sm text-ink-muted">
        El nombre y lo que incluye cada opción salen en el PDF: escríbelos en inglés.
      </span>
      <ConfirmDialog
        open={removing !== null}
        title={`¿Quitar la opción ${String((removing ?? 0) + 1)}?`}
        message={`Se borra${optionToRemove?.title.trim() ? ` “${optionToRemove.title.trim()}”` : ''} con sus ${String(optionToRemove?.items.length ?? 0)} trabajos.`}
        confirmLabel="Sí, quitar"
        onConfirm={() => {
          if (removing !== null) remove(removing);
          setRemoving(null);
        }}
        onCancel={() => {
          setRemoving(null);
        }}
      />
    </section>
  );
}
