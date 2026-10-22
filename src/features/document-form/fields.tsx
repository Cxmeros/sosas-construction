import { get, type FieldErrors } from 'react-hook-form';
import { useId, useState, type ReactNode } from 'react';
import type { FormValues } from '../../domain/form';
import { DownIcon } from '../../ui/Icons';

export function errorAt(errors: FieldErrors<FormValues>, path: string): string | undefined {
  const error: unknown = get(errors, path);
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return undefined;
}

export const errorId = (path: string) => `err-${path.replace(/\./g, '-')}`;

export function FieldError({ path, message }: { path: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <span id={errorId(path)} className="flex items-center gap-1.5 text-sm font-semibold text-error">
      <span aria-hidden="true">●</span>
      {message}
    </span>
  );
}

/** Label wrapping its control, with the error message right below (SPEC §9). */
export function Field({
  label,
  path,
  error,
  children,
  className = '',
}: {
  label: ReactNode;
  path: string;
  error: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`label ${className}`} data-invalid={error ? 'true' : undefined}>
      {label}
      {children}
      <FieldError path={path} message={error} />
    </label>
  );
}

/** aria props for an input bound to `path`. */
export function invalidProps(path: string, error: string | undefined) {
  return error ? { 'aria-invalid': true as const, 'aria-describedby': errorId(path) } : {};
}

export function SectionTitle({
  n,
  children,
  aside,
}: {
  n: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <h2 className="section-title">
      <span className="n">{n}</span>
      {children}
      {aside && (
        <span className="ml-auto font-sans text-[15px] font-semibold tracking-normal text-ink-muted normal-case">
          {aside}
        </span>
      )}
    </h2>
  );
}

/** Mobile section card (white on the grey page); on desktop sections sit directly on the page. */
export function Section({ desktop, children }: { desktop: boolean; children: ReactNode }) {
  if (desktop) return <section className="flex flex-col gap-3">{children}</section>;
  return (
    <section className="flex flex-col gap-3.5 border border-line bg-surface p-4">
      {children}
    </section>
  );
}

/**
 * Mobile card that folds to a one-line summary once filled, so the work items come sooner.
 * `forceOpen` (empty or with errors) opens it; inputs stay mounted while folded.
 */
export function FoldSection({
  n,
  title,
  summary,
  defaultOpen,
  forceOpen,
  children,
}: {
  n: string;
  title: string;
  summary: string;
  defaultOpen: boolean;
  forceOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  // Opens when forceOpen turns on (an error, a new blank document) but can always be closed.
  const [wasForced, setWasForced] = useState(forceOpen);
  if (forceOpen !== wasForced) {
    setWasForced(forceOpen);
    if (forceOpen) setOpen(true);
  }

  return (
    <section className="flex flex-col border border-line bg-surface">
      <h2 className="m-0 text-base font-normal">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen(!open);
          }}
          className="flex min-h-12 w-full items-center gap-2 p-4 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="section-title">
              <span className="n">{n}</span>
              {title}
            </span>
            {!open && summary && (
              <span className="text-[15px] font-semibold break-words text-ink-muted">
                {summary}
              </span>
            )}
          </span>
          <span className="flex-none text-sm font-semibold text-walnut-700 underline underline-offset-4">
            {open ? 'Cerrar' : 'Editar'}
          </span>
          <DownIcon size={24} className={`flex-none text-walnut-700 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={id} hidden={!open} className="flex flex-col gap-3.5 px-4 pb-4">
        {children}
      </div>
    </section>
  );
}

/** Segmented control built on native radios (arrow keys, screen readers). */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  className = '',
  itemClassName = '',
}: {
  name: string;
  legend: string;
  options: readonly { value: T; label: string; span?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <fieldset className={`m-0 min-w-0 border-0 p-0 ${className}`}>
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="flex"
          style={o.span ? { gridColumn: `span ${String(o.span)}` } : undefined}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => {
              onChange(o.value);
            }}
            className="peer sr-only"
          />
          <span
            className={`flex w-full items-center justify-center bg-surface text-walnut-700 select-none peer-checked:bg-walnut-700 peer-checked:text-white peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red-700 ${itemClassName}`}
          >
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
