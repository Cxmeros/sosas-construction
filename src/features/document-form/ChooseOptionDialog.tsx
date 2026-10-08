import { useState } from 'react';
import { formatCents } from '../../domain/money';
import type { DocumentData, Totals } from '../../domain/types';
import { Dialog } from '../../ui/Dialog';

/** "Which option did the customer accept?" — an invoice carries only that one. */
export function ChooseOptionDialog({
  open,
  doc,
  totals,
  confirmLabel,
  onChoose,
  onCancel,
}: {
  open: boolean;
  doc: DocumentData;
  totals: Totals[];
  confirmLabel: string;
  onChoose: (optionIndex: number) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const close = () => {
    setPicked(null);
    onCancel();
  };

  return (
    <Dialog open={open} onClose={close} labelledBy="choose-option-title">
      <h2 id="choose-option-title" className="btn-cond m-0 text-[22px] text-walnut-700">
        ¿Qué opción aceptó el cliente?
      </h2>
      <p className="m-0 text-base text-ink-muted">
        El invoice lleva solo esa opción. Las demás se quitan.
      </p>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="sr-only">Opción aceptada</legend>
        {doc.options.map((option, k) => (
          <label
            key={option.id}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-walnut-700 bg-surface px-3 has-[:checked]:bg-cream has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-700"
          >
            <input
              type="radio"
              name="accepted-option"
              checked={picked === k}
              onChange={() => {
                setPicked(k);
              }}
              className="size-5 flex-none accent-walnut-700"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-semibold">Opción {k + 1}</span>
              {option.title && (
                <span className="truncate text-[15px] text-ink-muted">{option.title}</span>
              )}
            </span>
            <span className="font-cond text-xl font-bold tabular-nums">
              {formatCents(totals[k]?.totalCents ?? 0)}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="mt-2 grid grid-cols-[1.2fr_1fr] gap-2">
        <button
          type="button"
          disabled={picked === null}
          onClick={() => {
            if (picked === null) return;
            onChoose(picked);
            setPicked(null);
          }}
          className="min-h-12 rounded-field bg-brand-700 text-base font-bold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={close}
          className="min-h-12 rounded-field border-[1.5px] border-walnut-700 bg-surface text-base font-semibold text-walnut-700 hover:bg-cream"
        >
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
