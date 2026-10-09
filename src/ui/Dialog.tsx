import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  /** Bottom sheet on phones, centered card on desktop. */
  children: ReactNode;
}

/** Native <dialog>: focus trap, Esc to close and inert background for free. */
export function Dialog({ open, onClose, labelledBy, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first button, overriding autoFocus; put focus on the safe choice.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none border-0 border-t-[3px] border-red-500 bg-surface p-0 text-ink backdrop:bg-[rgba(20,12,8,0.55)] lg:m-auto lg:max-w-[440px] lg:border-[1.5px] lg:border-t-[3px] lg:border-walnut-700"
    >
      {open && <div className="flex flex-col gap-2.5 p-4">{children}</div>}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Dialog open={open} onClose={onCancel} labelledBy="confirm-title">
      <h2 id="confirm-title" className="btn-cond m-0 text-[22px] text-walnut-700">
        {title}
      </h2>
      <p className="m-0 text-base text-ink-muted">{message}</p>
      <div className="mt-2 grid grid-cols-[1fr_1.2fr] gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-12 rounded-field border-2 border-error bg-surface text-base font-bold text-error hover:bg-error-bg"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          data-autofocus
          className="min-h-12 rounded-field bg-walnut-700 text-base font-bold text-white hover:bg-walnut-900"
        >
          Cancelar
        </button>
      </div>
    </Dialog>
  );
}
