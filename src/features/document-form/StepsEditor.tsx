import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { parseSteps, type FormValues } from '../../domain/form';
import { LIMITS } from '../../domain/limits';
import type { DocumentData } from '../../domain/types';
import { savePrefs } from '../../lib/storage';
import { errorAt, Field, invalidProps, Section, SectionTitle } from './fields';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

/** Estimate-only work-process steps (SPEC §3.7b), one per line, with a saveable default. */
export function StepsEditor({ form, desktop }: { form: Form; desktop: boolean }) {
  const { register, formState, getValues } = form;
  const error = errorAt(formState.errors, 'steps');
  const [saved, setSaved] = useState(false);

  const saveDefault = () => {
    const raw = getValues('steps');
    const steps = parseSteps(raw);
    if (steps.length > LIMITS.maxSteps || steps.some((s) => s.length > LIMITS.stepLength)) return;
    savePrefs({ defaultSteps: raw.trim() });
    setSaved(true);
  };

  return (
    <Section desktop={desktop}>
      <SectionTitle n="4b">Pasos del proceso</SectionTitle>
      <Field
        label={
          <span className="text-sm font-normal text-ink-muted">
            Opcional: un paso por renglón. Salen numerados en el PDF (en inglés). Si lo dejas vacío,
            no sale.
          </span>
        }
        path="steps"
        error={error}
      >
        <textarea
          rows={desktop ? 5 : 6}
          maxLength={LIMITS.stepsText}
          aria-label="Pasos del proceso"
          placeholder={'ej. Move furniture\nSand floors\nApply finish'}
          className={`field font-normal ${desktop ? 'text-[15px]' : 'text-base'}`}
          {...invalidProps('steps', error)}
          {...register('steps', {
            onChange: () => {
              setSaved(false);
            },
          })}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveDefault}
          className={`min-h-12 rounded-field border-[1.5px] border-walnut-700 bg-surface px-4 font-semibold text-walnut-700 hover:bg-cream ${desktop ? 'self-start text-base' : 'text-[17px]'}`}
        >
          Guardar como predeterminado
        </button>
        <span role="status" className="text-sm text-ink-muted">
          {saved ? 'Listo: los próximos estimates empiezan con estos pasos.' : ''}
        </span>
      </div>
    </Section>
  );
}
