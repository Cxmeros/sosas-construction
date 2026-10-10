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
      className={`z-30 flex items-center justify-between gap-2 rounded-field border border-l-4 border-line border-l-success bg-surface py-1 pr-1 pl-3 text-ink shadow-[0_8px_24px_rgba(24,24,27,0.12)] ${className}`}
    >
      <span className="flex items-center gap-2 py-2 text-[15px] font-semibold">
        <CheckIcon size={20} className="flex-none text-success" />
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
