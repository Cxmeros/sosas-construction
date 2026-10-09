import { useEffect, useRef, useState, type RefObject } from 'react';
import { UndoIcon } from './Icons';

/** SPEC §3.14: removing a trabajo, step or charge offers "DESHACER" for 6 seconds. */
const UNDO_MS = 6000;

/**
 * Remembers the last removed row so it can be put back. Focus moves to "Deshacer" (keyboard and
 * screen-reader users stay in place) and, when the offer expires, to `fallback` (the add button).
 */
export function useUndoRemove<T>(
  restore: (index: number, item: T) => void,
  fallback: RefObject<HTMLElement | null>,
) {
  const [undo, setUndo] = useState<{ item: T; index: number; label: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const offer = (index: number, item: T, label: string) => {
    clearTimeout(timer.current);
    setUndo({ item, index, label });
    setTimeout(() => button.current?.focus(), 0);
    timer.current = setTimeout(() => {
      if (document.activeElement === button.current) fallback.current?.focus();
      setUndo(null);
    }, UNDO_MS);
  };

  const doUndo = () => {
    if (!undo) return;
    clearTimeout(timer.current);
    restore(undo.index, undo.item);
    setUndo(null);
  };

  /** Inline on dark ink (desktop) or floating above the bottom bar (phone). */
  const toast = (desktop: boolean) =>
    undo && (
      <div
        role="status"
        className={
          desktop
            ? 'flex min-w-0 items-center gap-1 bg-ink pl-3.5 text-white'
            : 'fixed right-3 bottom-[calc(96px+env(safe-area-inset-bottom))] left-3 z-20 flex items-center justify-between border-2 border-walnut-900 bg-surface pr-1 pl-4 text-ink shadow-[0_12px_32px_rgba(31,23,18,0.35)]'
        }
      >
        <span className="min-w-0 truncate text-base">{undo.label}</span>
        <button
          ref={button}
          type="button"
          onClick={doUndo}
          className={`flex min-h-12 flex-none items-center gap-1.5 px-3.5 text-base font-bold tracking-[0.04em] uppercase ${desktop ? 'text-oak-300' : 'text-red-700'}`}
        >
          <UndoIcon size={20} />
          Deshacer
        </button>
      </div>
    );

  return { offer, toast, active: undo !== null };
}

/** "“Install and refinish” eliminado", or "Trabajo #2 eliminado" when it had no text. */
export const removedLabel = (text: string, fallback: string) =>
  text.trim() ? `“${text.trim()}” eliminado` : `${fallback} eliminado`;
