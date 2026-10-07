import { formatCents } from '../../domain/money';
import { optionTotals } from '../../domain/calc';
import { downloadBlob, mailtoUrl, whatsappUrl } from '../../lib/share';
import { Dialog } from '../../ui/Dialog';
import { DownloadIcon } from '../../ui/Icons';
import { COMPANY } from '../../config/company';
import type { PdfFile } from './usePdfActions';

/**
 * Fallback when the device can't share files (design 4b). WhatsApp and email links can't carry
 * the file, so the PDF is downloaded first for the user to attach.
 */
export function SharePanel({ file, onClose }: { file: PdfFile | null; onClose: () => void }) {
  const doc = file?.doc;
  const name = doc?.customer.name ?? '';
  const kind = doc?.type === 'invoice' ? 'invoice' : 'work estimate';
  const totals = doc ? optionTotals(doc) : [];
  const amounts =
    totals.length > 1
      ? `${String(totals.length)} options: ${totals.map((t, k) => `Option ${String(k + 1)} ${formatCents(t.totalCents)}`).join(', ')}.`
      : `Balance: ${formatCents(totals[0]?.balanceCents ?? 0)}.`;
  const greeting = `Hello ${name}, here is your ${kind} ${doc?.number ?? ''} from ${COMPANY.name}. ${amounts} The PDF is attached.`;
  const wa = doc ? whatsappUrl(doc.customer.phone, greeting) : null;
  const mail = doc
    ? mailtoUrl(
        doc.customer.email,
        `${kind === 'invoice' ? 'Invoice' : 'Work Estimate'} ${doc.number} – ${COMPANY.name}`,
        greeting,
      )
    : null;

  const save = () => {
    if (file) downloadBlob(file.blob, file.fileName);
  };
  const open = (url: string) => {
    save();
    if (url.startsWith('mailto:')) window.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const option =
    'flex min-h-14 items-center gap-3 rounded-field border-[1.5px] border-walnut-700 bg-surface px-4 text-left text-[17px] font-semibold hover:bg-cream';

  return (
    <Dialog open={file !== null} onClose={onClose} labelledBy="share-title">
      <h2 id="share-title" className="btn-cond m-0 text-[22px] text-walnut-700">
        Enviar a {name}
      </h2>
      <p className="m-0 text-[15px] text-ink-muted">
        Este aparato no puede compartir archivos. Se descarga el PDF: adjúntalo en el mensaje.
      </p>
      {wa && (
        <button
          type="button"
          className={option}
          onClick={() => {
            open(wa);
          }}
        >
          <span className="size-3 flex-none bg-success" aria-hidden="true" />
          WhatsApp · {doc?.customer.phone}
        </button>
      )}
      {mail && (
        <button
          type="button"
          className={option}
          onClick={() => {
            open(mail);
          }}
        >
          <span className="size-3 flex-none bg-orange-700" aria-hidden="true" />
          <span className="min-w-0 break-words">Correo · {doc?.customer.email}</span>
        </button>
      )}
      <button type="button" className={option} onClick={save}>
        <DownloadIcon />
        Descargar PDF
      </button>
      <button type="button" onClick={onClose} className="min-h-12 font-semibold text-walnut-700">
        Cancelar
      </button>
    </Dialog>
  );
}
