import type { UseFormReturn } from 'react-hook-form';
import type { DepositMode, FormValues } from '../../domain/form';
import { formatCents, formatQty } from '../../domain/money';
import type { DocumentData, Totals } from '../../domain/types';
import { savePrefs } from '../../lib/storage';
import { errorAt, Field, invalidProps, Section, SectionTitle, Segmented } from './fields';

type Form = UseFormReturn<FormValues, unknown, DocumentData>;

const OPTIONS: readonly { value: DepositMode; label: string; span: number }[] = [
  { value: '20', label: '20 %', span: 2 },
  { value: '30', label: '30 %', span: 2 },
  { value: 'percent', label: 'Otro %', span: 2 },
  { value: 'fixed', label: 'Monto fijo', span: 3 },
  { value: 'none', label: 'Sin anticipo', span: 3 },
];

/** On an invoice the deposit is money already received: an amount, never a percentage to ask for. */
const INVOICE_OPTIONS: readonly { value: DepositMode; label: string; span: number }[] = [
  { value: 'fixed', label: 'Sí, me pagó', span: 3 },
  { value: 'none', label: 'No me pagó', span: 3 },
];

export function depositLabels(invoice: boolean, doc: DocumentData) {
  const pct =
    doc.deposit.mode === 'percent' ? ` (${formatQty(doc.deposit.percentHundredths)} %)` : '';
  return {
    title: invoice ? 'Anticipo recibido' : 'Anticipo',
    deposit: (invoice ? 'Anticipo recibido' : 'Anticipo') + pct,
    balance: invoice ? 'Saldo a pagar' : 'Saldo',
  };
}

export function DepositSection({
  form,
  doc,
  totals,
  desktop,
  hintCents = null,
}: {
  form: Form;
  doc: DocumentData;
  totals: Totals;
  desktop: boolean;
  /** Deposit the estimate asked for, offered as a one-tap answer on the invoice. */
  hintCents?: number | null;
}) {
  const { register, setValue, watch, formState, getValues } = form;
  const mode = watch('depositMode');
  const invoice = doc.type === 'invoice';
  const labels = depositLabels(invoice, doc);
  const pctError = errorAt(formState.errors, 'depositPercent');
  const fixedError = errorAt(formState.errors, 'depositFixed');

  const choose = (value: DepositMode) => {
    setValue('depositMode', value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    if (value === '20' || value === '30') savePrefs({ depositPercent: value });
    if (value === 'percent' && getValues('depositPercent').trim())
      savePrefs({ depositPercent: getValues('depositPercent').trim() });
  };

  return (
    <Section desktop={desktop}>
      <SectionTitle n="05">{labels.title}</SectionTitle>
      <Segmented
        name="depositMode"
        legend={labels.title}
        options={invoice ? INVOICE_OPTIONS : OPTIONS}
        value={mode}
        onChange={choose}
        className="grid grid-cols-6 gap-2"
        itemClassName={`min-h-12 rounded-field border-[1.5px] border-walnut-700 font-semibold ${desktop ? 'text-[15px]' : 'text-base'}`}
      />
      {mode === 'percent' && (
        <Field label="Porcentaje %" path="depositPercent" error={pctError}>
          <input
            inputMode="decimal"
            autoComplete="off"
            maxLength={6}
            className="field num"
            {...invalidProps('depositPercent', pctError)}
            {...register('depositPercent', {
              onBlur: (e: { target: HTMLInputElement }) => {
                if (e.target.value.trim()) savePrefs({ depositPercent: e.target.value.trim() });
              },
            })}
          />
        </Field>
      )}
      {mode === 'fixed' && (
        <Field
          label={invoice ? '¿Cuánto te pagó de anticipo? $' : 'Monto del anticipo $'}
          path="depositFixed"
          error={fixedError}
        >
          <input
            inputMode="decimal"
            autoComplete="off"
            maxLength={20}
            className="field num"
            {...invalidProps('depositFixed', fixedError)}
            {...register('depositFixed')}
          />
        </Field>
      )}
      {/* Outside the label so the hint isn't read as part of the field's name. */}
      {mode === 'fixed' && invoice && hintCents !== null && !watch('depositFixed').trim() && (
        <button
          type="button"
          onClick={() => {
            setValue('depositFixed', (hintCents / 100).toFixed(2), {
              shouldDirty: true,
              shouldValidate: formState.isSubmitted,
            });
          }}
          className="min-h-12 self-start rounded-field border-[1.5px] border-dashed border-walnut-700 px-3 text-left text-[15px] font-semibold text-walnut-700 hover:bg-cream"
        >
          Usar {formatCents(hintCents)}: lo que pediste en el estimate
        </button>
      )}
      <div className={`flex flex-col tabular-nums ${desktop ? '' : 'border-t border-line'}`}>
        {!desktop && (
          <div className="flex justify-between py-2.5 text-base">
            <span>Total</span>
            <span className="font-semibold">{formatCents(totals.totalCents)}</span>
          </div>
        )}
        {mode !== 'none' && (
          <div
            className={`flex justify-between text-base ${desktop ? 'border-b border-dashed border-line py-2' : 'border-t border-dashed border-line py-2.5'}`}
          >
            <span>{labels.deposit}</span>
            <span className="font-semibold">
              {invoice && totals.depositCents > 0 ? '−' : ''}
              {formatCents(totals.depositCents)}
            </span>
          </div>
        )}
        <div
          className={`flex items-baseline justify-between px-3 text-white ${desktop ? 'py-2' : 'py-2.5'} ${invoice ? 'bg-orange-700' : 'bg-walnut-900'}`}
        >
          <span className="font-semibold">{labels.balance}</span>
          <span className={`font-cond font-bold ${desktop ? 'text-[22px]' : 'text-2xl'}`}>
            {formatCents(totals.balanceCents)}
          </span>
        </div>
      </div>
    </Section>
  );
}
