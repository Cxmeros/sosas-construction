import { CheckIcon } from './Icons';

export interface Notice {
  text: string;
  action?: { label: string; run: () => void };
}

/** Success message with an optional follow-up ("Deshacer", "Nuevo documento"). */
export function NoticeToast({
  notice,
  onDone,
  className,
}: {
  notice: Notice | null;
  onDone: () => void;
  className: string;
}) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className={`z-30 flex items-center justify-between gap-2 bg-success py-1 pr-1 pl-4 text-white shadow-[0_10px_28px_rgba(20,40,24,0.28)] ${className}`}
    >
      <span className="flex items-center gap-2 py-2 text-[15px] font-semibold">
        <CheckIcon size={20} className="flex-none" />
        {notice.text}
      </span>
      {notice.action && (
        <button
          type="button"
          onClick={() => {
            notice.action?.run();
            onDone();
          }}
          className="min-h-12 flex-none px-3 text-[15px] font-bold whitespace-nowrap underline underline-offset-4"
        >
          {notice.action.label}
        </button>
      )}
    </div>
  );
}
