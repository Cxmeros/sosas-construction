import type { FieldErrors } from 'react-hook-form';
import type { FormValues } from '../../domain/form';
import { LIMITS } from '../../domain/limits';
import { formatCents } from '../../domain/money';
import { formatDateUS } from '../../domain/numbering';
import type { DocType, Totals } from '../../domain/types';
import { AlertIcon } from '../../ui/Icons';
import type { DocumentState } from './useDocument';
import { DepositSection } from './DepositSection';
import { errorAt, Field, invalidProps, Section, SectionTitle, Segmented } from './fields';
import { ItemsEditor } from './ItemsEditor';

const DOC_OPTIONS: readonly { value: DocType; label: string }[] = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'invoice', label: 'Invoice' },
];

/** Number of fields with an error (leaves of the errors tree). */
export function countErrors(errors: FieldErrors<FormValues>): number {
  let n = 0;
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if ('message' in node && typeof node.message === 'string' && 'type' in node) {
      n += 1;
      return;
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(errors);
  return n;
}

export function ErrorSummary({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div role="alert" className="flex gap-2.5 border-2 border-error bg-error-bg p-3 text-error-ink">
      <AlertIcon className="flex-none" />
      <div className="flex flex-col gap-1">
        <strong className="text-base">
          {count === 1
            ? 'Falta 1 dato para crear el PDF'
            : `Faltan ${String(count)} datos para crear el PDF`}
        </strong>
        <span className="text-[15px]">Revisa los campos marcados.</span>
      </div>
    </div>
  );
}

export function DocumentForm({
  state,
  totals,
  desktop,
}: {
  state: DocumentState;
  totals: Totals;
  desktop: boolean;
}) {
  const { form, values, doc, setType, depositHint } = state;
  const { register, formState } = form;
  const errors = formState.errors;
  const err = (path: string) => errorAt(errors, path);
  const errorCount = formState.isSubmitted ? countErrors(errors) : 0;
  const isBlank = !values.customer.name.trim() && values.items.length === 0;

  const typeSwitch = (
    <Segmented
      name="type"
      legend="Tipo de documento"
      options={DOC_OPTIONS}
      value={values.type}
      onChange={setType}
      className="grid grid-cols-2 border-[1.5px] border-walnut-700"
      itemClassName={`btn-cond ${desktop ? 'min-h-12 text-[19px]' : 'min-h-[52px] text-xl'}`}
    />
  );
  const numberField = (
    <Field label="Número" path="number" error={err('number')}>
      <input
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={LIMITS.number}
        className="field tabular-nums"
        {...invalidProps('number', err('number'))}
        {...register('number')}
      />
    </Field>
  );
  const dateField = (
    <Field label="Fecha" path="date" error={err('date')}>
      <input
        type="date"
        className="field px-2.5"
        {...invalidProps('date', err('date'))}
        {...register('date')}
      />
      {/* The phone may show the date as day/month; the PDF always prints month-day. */}
      {values.date && (
        <span className="text-sm font-normal text-ink-muted">
          En el PDF: {formatDateUS(values.date)}
        </span>
      )}
    </Field>
  );
  const customer = (
    <>
      <Field label="Nombre" path="customer.name" error={err('customer.name')}>
        <input
          autoComplete="name"
          maxLength={LIMITS.customerName}
          placeholder={isBlank ? 'ej. Margaret Kelly' : undefined}
          className="field"
          {...invalidProps('customer.name', err('customer.name'))}
          {...register('customer.name')}
        />
      </Field>
      <Field label="Dirección" path="customer.address" error={err('customer.address')}>
        <input
          autoComplete="street-address"
          maxLength={LIMITS.address}
          className="field"
          {...register('customer.address')}
        />
      </Field>
      <Field label="Teléfono" path="customer.phone" error={err('customer.phone')}>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={LIMITS.phone}
          placeholder={isBlank ? '(610) 555-0000' : undefined}
          className="field"
          {...invalidProps('customer.phone', err('customer.phone'))}
          {...register('customer.phone')}
        />
      </Field>
      <Field label="Email" path="customer.email" error={err('customer.email')}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={LIMITS.email}
          className="field"
          {...invalidProps('customer.email', err('customer.email'))}
          {...register('customer.email')}
        />
      </Field>
    </>
  );
  const jobDescription = (
    <textarea
      rows={desktop ? 3 : 4}
      maxLength={LIMITS.jobDescription}
      className="field font-normal"
      {...register('jobDescription')}
    />
  );
  const terms = (
    <textarea
      rows={desktop ? 6 : 5}
      maxLength={LIMITS.terms}
      aria-label="Términos y condiciones"
      className={`field font-normal ${desktop ? 'text-[15px]' : 'text-base'}`}
      {...register('terms')}
    />
  );

  if (desktop) {
    return (
      <div className="flex flex-col gap-6">
        <ErrorSummary count={errorCount} />
        <Section desktop>
          <SectionTitle n="01">Documento</SectionTitle>
          <div className="grid grid-cols-[280px_1fr_1fr] items-start gap-4">
            <div className="label">
              <span aria-hidden="true">Tipo</span>
              {typeSwitch}
            </div>
            {numberField}
            {dateField}
          </div>
        </Section>
        <Section desktop>
          <SectionTitle n="02">Cliente</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">{customer}</div>
        </Section>
        <label className="label gap-2">
          <span className="section-title">
            <span className="n">03</span>Descripción del trabajo
          </span>
          {jobDescription}
        </label>
        <ItemsEditor form={form} desktop totalLabel={formatCents(totals.totalCents)} />
        <div className="grid grid-cols-2 gap-6">
          <DepositSection form={form} doc={doc} totals={totals} desktop hintCents={depositHint} />
          <label className="label gap-3">
            <span className="section-title">
              <span className="n">06</span>Términos
            </span>
            {terms}
            <span className="text-sm font-normal text-ink-muted">
              Este texto sale en inglés en el PDF.
            </span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ErrorSummary count={errorCount} />
      {!isBlank && (
        <h1 className="sr-only">
          {values.type === 'invoice' ? 'Invoice' : 'Work Estimate'} {values.number}
        </h1>
      )}
      {isBlank && (
        <div className="flex flex-col gap-1">
          <h1 className="btn-cond m-0 text-[28px] leading-[1.1] text-walnut-900">
            Nuevo documento
          </h1>
          <span className="text-base text-ink-muted">Elige el tipo y empieza por el cliente.</span>
        </div>
      )}
      <Section desktop={false}>
        <SectionTitle n="01">Documento</SectionTitle>
        {typeSwitch}
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[1fr_1.3fr]">
          {numberField}
          {dateField}
        </div>
      </Section>
      <Section desktop={false}>
        <SectionTitle n="02">Cliente</SectionTitle>
        {customer}
      </Section>
      <Section desktop={false}>
        <SectionTitle n="03">Trabajo</SectionTitle>
        <label className="label">
          Descripción del trabajo
          {jobDescription}
        </label>
      </Section>
      <ItemsEditor form={form} desktop={false} totalLabel={formatCents(totals.totalCents)} />
      <DepositSection
        form={form}
        doc={doc}
        totals={totals}
        desktop={false}
        hintCents={depositHint}
      />
      <Section desktop={false}>
        <SectionTitle n="06">Términos</SectionTitle>
        {terms}
        <span className="text-sm text-ink-muted">Este texto sale en inglés en el PDF.</span>
      </Section>
    </div>
  );
}
