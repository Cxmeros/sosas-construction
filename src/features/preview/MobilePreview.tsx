import { formatCents } from '../../domain/money';
import type { DocumentData, Totals } from '../../domain/types';
import { NoticeToast, type Notice } from '../../ui/NoticeToast';
import { BackIcon, ConvertIcon, DownloadIcon, FilePlusIcon, ShareIcon } from '../../ui/Icons';
import { depositLabels } from '../document-form/DepositSection';
import { PdfPreview } from './PdfPreview';

interface Props {
  doc: DocumentData;
  totals: Totals;
  busy: 'share' | 'download' | null;
  notice: Notice | null;
  onNoticeDone: () => void;
  onBack: () => void;
  onShare: () => void;
  onDownload: () => void;
  onConvert: () => void;
  onNew: () => void;
}

/**
 * Design 4a: the PDF, with what matters before sending (who, how much) readable at a glance —
 * the page itself is too small to read on a phone.
 */
export function MobilePreview({
  doc,
  totals,
  busy,
  notice,
  onNoticeDone,
  onBack,
  onShare,
  onDownload,
  onConvert,
  onNew,
}: Props) {
  const invoice = doc.type === 'invoice';
  const labels = depositLabels(invoice, doc);
  const secondary =
    'flex min-h-14 flex-1 items-center justify-center gap-2 rounded-field border-[1.5px] border-oak-300 px-2 text-[15px] font-semibold text-white disabled:opacity-60';

  return (
    <div className="on-dark flex h-dvh flex-col bg-walnut-900">
      <header className="flex h-[76px] flex-none items-center gap-2 pr-3 pl-1 text-white">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-12 items-center gap-1.5 px-3 text-[17px] font-semibold"
        >
          <BackIcon /> Editar
        </button>
        <h1 className="m-0 min-w-0 flex-1 truncate text-right font-cond text-lg font-bold tracking-[0.02em] text-oak-300 uppercase">
          {invoice ? 'Invoice' : 'Work Estimate'} {doc.number}
        </h1>
        <button
          type="button"
          onClick={onNew}
          aria-label="Nuevo documento"
          className="flex min-h-12 flex-none items-center gap-2 rounded-field border-[1.5px] border-oak-300 px-3.5 text-[17px] font-semibold text-white"
        >
          <FilePlusIcon size={22} /> Nuevo
        </button>
      </header>
      <NoticeToast notice={notice} onDone={onNoticeDone} className="flex-none" />
      <main className="flex-1 overflow-auto bg-walnut-400 p-3">
        <PdfPreview
          doc={doc}
          pageLabel={(n, total) =>
            `Página ${String(n)} de ${String(total)} · pellizca para ampliar`
          }
        />
      </main>
      <div className="flex flex-none flex-col gap-3 border-t-[3px] border-red-500 p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {/* What the customer will see, readable in sunlight before sending. */}
        <dl className="m-0 grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 px-1 tabular-nums">
          <dt className="sr-only">Para</dt>
          <dd className="col-span-2 m-0 truncate text-[17px] font-semibold text-white">
            Para {doc.customer.name}
          </dd>
          <dt className="text-[15px] text-oak-300">Total</dt>
          <dd className="m-0 text-right font-cond text-[22px] font-bold text-white">
            {formatCents(totals.totalCents)}
          </dd>
          {doc.deposit.mode !== 'none' && (
            <>
              <dt className="text-[15px] text-oak-300">{labels.balance}</dt>
              <dd className="m-0 text-right font-cond text-[22px] font-bold text-oak-300">
                {formatCents(totals.balanceCents)}
              </dd>
            </>
          )}
        </dl>
        <button
          type="button"
          onClick={onShare}
          disabled={busy !== null}
          className="flex min-h-16 flex-col items-center justify-center rounded-field bg-crimson-cta font-bold text-white hover:bg-red-700 disabled:opacity-70"
        >
          <span className="flex items-center gap-2.5 text-xl">
            <ShareIcon strokeWidth={1.75} />
            {busy === 'share' ? 'Creando PDF…' : 'Compartir'}
          </span>
          <span className="text-[13px] font-semibold">WhatsApp, Mensajes o correo</span>
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onDownload} disabled={busy !== null} className={secondary}>
            <DownloadIcon />
            {busy === 'download' ? 'Creando…' : 'Descargar'}
          </button>
          {!invoice && (
            <button type="button" onClick={onConvert} className={secondary}>
              <ConvertIcon />
              Convertir en Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
