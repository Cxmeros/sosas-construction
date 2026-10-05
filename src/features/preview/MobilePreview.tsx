import type { DocumentData } from '../../domain/types';
import { buildPdfModel } from '../../pdf/model';
import { BackIcon, ConvertIcon, DownloadIcon, FilePlusIcon, ShareIcon } from '../../ui/Icons';
import { PdfPreview } from './PdfPreview';

interface Props {
  doc: DocumentData;
  busy: 'share' | 'download' | null;
  notice: string | null;
  onBack: () => void;
  onShare: () => void;
  onDownload: () => void;
  onConvert: () => void;
  onNew: () => void;
}

/** Design 4a: full-screen PDF with Compartir, Descargar, Convertir en Invoice, Nuevo documento. */
export function MobilePreview({
  doc,
  busy,
  notice,
  onBack,
  onShare,
  onDownload,
  onConvert,
  onNew,
}: Props) {
  const fileName = buildPdfModel(doc).fileName;
  const secondary =
    'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-field border-[1.5px] border-oak-300 px-1 text-center text-sm font-semibold text-white disabled:opacity-60';
  return (
    <div className="on-dark flex h-dvh flex-col bg-walnut-900">
      <header className="flex h-16 flex-none items-center gap-1 pr-3 pl-1 text-white">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-12 items-center gap-1.5 px-3 text-[17px] font-semibold"
        >
          <BackIcon /> Editar
        </button>
        <span className="min-w-0 flex-1 truncate text-right text-sm text-oak-300">{fileName}</span>
      </header>
      {notice && (
        <div
          role="status"
          className="flex-none bg-success px-4 py-2 text-[15px] font-semibold text-white"
        >
          {notice}
        </div>
      )}
      <main className="flex-1 overflow-auto bg-walnut-400 p-3">
        <PdfPreview
          doc={doc}
          pageLabel={(n, total) =>
            `Página ${String(n)} de ${String(total)} · pellizca para ampliar`
          }
        />
      </main>
      <div className="flex flex-none flex-col gap-2.5 border-t-[3px] border-orange-500 p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onShare}
          disabled={busy !== null}
          className="btn-cond flex min-h-14 items-center justify-center gap-2.5 rounded-field bg-orange-400 text-[22px] text-ink hover:bg-orange-300 disabled:opacity-70"
        >
          <ShareIcon strokeWidth={1.75} />
          {busy === 'share' ? 'Creando PDF…' : 'Compartir'}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onDownload} disabled={busy !== null} className={secondary}>
            <DownloadIcon />
            {busy === 'download' ? 'Creando…' : 'Descargar'}
          </button>
          {doc.type === 'estimate' && (
            <button type="button" onClick={onConvert} className={`${secondary} flex-[1.3]`}>
              <ConvertIcon />
              Convertir en Invoice
            </button>
          )}
          <button type="button" onClick={onNew} className={secondary}>
            <FilePlusIcon />
            Nuevo documento
          </button>
        </div>
      </div>
    </div>
  );
}
