import { useEffect, useRef, useState } from 'react';
import logoUrl from './assets/logo-placeholder.png';
import { COMPANY } from './config/company';
import { computeTotals } from './domain/calc';
import { formatCents } from './domain/money';
import type { DocumentData } from './domain/types';
import { DocumentForm } from './features/document-form/DocumentForm';
import { depositLabels } from './features/document-form/DepositSection';
import { useDocument } from './features/document-form/useDocument';
import { MobilePreview } from './features/preview/MobilePreview';
import { pageCountOf, PdfPreview } from './features/preview/PdfPreview';
import { SharePanel } from './features/preview/SharePanel';
import { usePdfActions } from './features/preview/usePdfActions';
import { formatSavedAt } from './lib/format';
import { ConfirmDialog } from './ui/Dialog';
import { CheckIcon, FileIcon, UndoIcon } from './ui/Icons';
import { useIsDesktop } from './ui/useMediaQuery';

function SavedIndicator({
  savedAt,
  className = '',
}: {
  savedAt: number | null;
  className?: string;
}) {
  if (savedAt === null) return null;
  return (
    <span
      className={`flex items-center gap-1.5 text-[13px] font-semibold text-success ${className}`}
    >
      <CheckIcon size={18} /> Borrador guardado
    </span>
  );
}

export function App() {
  const desktop = useIsDesktop();
  const state = useDocument();
  const { form, doc, savedAt, recovered } = state;
  const totals = computeTotals(doc.items, doc.deposit);
  const actions = usePdfActions();
  const [screen, setScreen] = useState<'form' | 'preview'>('form');
  const [confirm, setConfirm] = useState<'new' | 'discard' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // While the recovered-draft banner is open the form underneath is inert (design 6c).
  useEffect(() => {
    formRef.current?.toggleAttribute('inert', recovered !== null);
  }, [recovered, desktop, screen]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => {
      setNotice(null);
    }, 5000);
    return () => {
      clearTimeout(t);
    };
  }, [notice]);

  /** Runs `fn` with the validated document; otherwise shows the errors next to each field. */
  const withValid = (fn: (d: DocumentData) => void) => {
    void form.handleSubmit(fn, () => {
      setScreen('form');
    })();
  };

  const share = () => {
    withValid((d) => void actions.share(d));
  };
  const download = () => {
    withValid((d) => void actions.download(d));
  };
  const convert = () => {
    const number = state.convertToInvoice();
    setNotice(`Listo: ahora es el Invoice ${number}.`);
  };
  const startNew = () => {
    state.newDocument();
    setConfirm(null);
    setScreen('form');
  };

  const docLabel = doc.type === 'invoice' ? 'Invoice' : 'Work Estimate';
  const labels = depositLabels(doc.type === 'invoice', doc);

  const recoveredBanner = recovered && (
    <div
      role="status"
      className="flex flex-none flex-col gap-3 border-b-2 border-gold-500 bg-cream px-4 py-3.5"
    >
      <div className="flex gap-2.5 text-walnut-700">
        <UndoIcon className="flex-none" />
        <div className="flex flex-col gap-0.5">
          <strong className="text-base">Recuperamos tu borrador</strong>
          <span className="text-[15px]">
            {recovered.values.type === 'invoice' ? 'Invoice' : 'Estimate'} {recovered.values.number}
            {recovered.values.customer.name ? ` · ${recovered.values.customer.name}` : ''} ·{' '}
            {formatSavedAt(recovered.savedAt)}
          </span>
        </div>
      </div>
      <div className={`grid grid-cols-[1.2fr_1fr] gap-2 ${desktop ? 'max-w-[420px]' : ''}`}>
        <button
          type="button"
          onClick={state.keepRecovered}
          className="min-h-12 rounded-field bg-orange-700 text-base font-bold text-white hover:bg-orange-800"
        >
          Seguir editando
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirm('discard');
          }}
          className="min-h-12 rounded-field border-[1.5px] border-walnut-700 text-base font-semibold text-walnut-700 hover:bg-surface"
        >
          Descartar
        </button>
      </div>
    </div>
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'discard' ? '¿Descartar el borrador?' : '¿Empezar un documento nuevo?'}
        message="Se borrará lo que llevas escrito en este documento. Esto no se puede deshacer."
        confirmLabel={confirm === 'discard' ? 'Sí, descartar' : 'Sí, empezar nuevo'}
        onConfirm={startNew}
        onCancel={() => {
          setConfirm(null);
        }}
      />
      <SharePanel file={actions.fallback} onClose={actions.closeFallback} />
      {actions.error && (
        <div
          role="alert"
          className="fixed inset-x-3 top-3 z-50 flex items-center justify-between gap-2 border-2 border-error bg-error-bg py-1 pr-1 pl-3 text-error-ink lg:left-auto lg:w-[420px]"
        >
          <span className="font-semibold">{actions.error}</span>
          <button type="button" onClick={actions.clearError} className="min-h-12 px-3 font-bold">
            OK
          </button>
        </div>
      )}
    </>
  );

  if (desktop) {
    const pages = pageCountOf(doc);
    const outline =
      'min-h-12 rounded-field border-[1.5px] border-walnut-700 bg-surface px-[18px] text-base font-semibold text-walnut-700 hover:bg-cream disabled:opacity-60';
    return (
      <div className="flex h-dvh flex-col bg-paper">
        <header className="flex h-[72px] flex-none items-center gap-5 border-b border-line-soft bg-surface px-6">
          <img src={logoUrl} alt={COMPANY.name} className="block h-12" />
          <div className="h-9 w-px bg-line-soft" />
          <div className="flex flex-col">
            <span className="font-cond text-[22px] font-bold text-walnut-900 uppercase">
              {docLabel} {doc.number}
            </span>
            <SavedIndicator savedAt={savedAt} />
          </div>
          {/* Starting over wipes the draft, so it sits apart from the export actions. */}
          <button
            type="button"
            className="min-h-12 rounded-field px-3 text-[15px] font-semibold text-walnut-700 underline underline-offset-4 hover:bg-cream"
            onClick={() => {
              setConfirm('new');
            }}
          >
            Nuevo documento
          </button>
          <div className="flex-1" />
          {notice && (
            <span role="status" className="text-[15px] font-semibold text-success">
              {notice}
            </span>
          )}
          {doc.type === 'estimate' && (
            <button type="button" className={outline} onClick={convert}>
              Convertir en Invoice
            </button>
          )}
          <button
            type="button"
            className={outline}
            onClick={download}
            disabled={actions.busy !== null}
          >
            {actions.busy === 'download' ? 'Creando PDF…' : 'Descargar PDF'}
          </button>
          <button
            type="button"
            onClick={share}
            disabled={actions.busy !== null}
            className="blueprint btn-cond min-h-12 bg-orange-700 px-[22px] text-xl text-white hover:bg-orange-800 disabled:opacity-70"
          >
            {actions.busy === 'share' ? 'Creando…' : 'Compartir'}
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_540px]">
          <div className="flex min-h-0 flex-col overflow-y-auto">
            {recoveredBanner}
            <main ref={formRef} className={`px-8 pt-6 pb-8 ${recovered ? 'opacity-55' : ''}`}>
              <DocumentForm state={state} totals={totals} desktop />
            </main>
          </div>
          <aside className="flex flex-col items-center gap-2.5 overflow-y-auto bg-walnut-400 p-6">
            <div className="flex self-stretch justify-between text-[13px] font-semibold tracking-[0.06em] text-oak-300 uppercase">
              <span>Vista previa en vivo</span>
              <span>Carta · {pages === 1 ? '1 de 1' : `${String(pages)} páginas`}</span>
            </div>
            <PdfPreview doc={doc} maxWidth={490} />
          </aside>
        </div>
        {dialogs}
      </div>
    );
  }

  if (screen === 'preview') {
    return (
      <>
        <MobilePreview
          doc={doc}
          busy={actions.busy}
          notice={notice}
          onBack={() => {
            setScreen('form');
          }}
          onShare={share}
          onDownload={download}
          onConvert={convert}
          onNew={() => {
            setConfirm('new');
          }}
        />
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex h-16 flex-none items-center justify-between border-b border-line-soft bg-surface pr-3 pl-4">
        <img src={logoUrl} alt={COMPANY.name} className="block h-10" />
        <SavedIndicator savedAt={savedAt} />
      </header>
      {recoveredBanner}
      <main
        ref={formRef}
        className={`flex-1 overflow-y-auto px-4 pt-4 pb-6 ${recovered ? 'opacity-55' : ''}`}
      >
        <DocumentForm state={state} totals={totals} desktop={false} />
      </main>
      <div className="on-dark flex flex-none items-center justify-between gap-3 border-t-[3px] border-orange-500 bg-walnut-900 pt-2.5 pr-3 pb-[calc(14px+env(safe-area-inset-bottom))] pl-4">
        <div className="flex flex-col tabular-nums">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-oak-300 uppercase">
            Total
          </span>
          <span className="font-cond text-[32px] leading-none font-bold text-white">
            {formatCents(totals.totalCents)}
          </span>
          <span className="text-[13px] text-oak-300">
            {totals.totalCents === 0
              ? 'Agrega partidas'
              : doc.deposit.mode === 'none'
                ? 'Sin anticipo'
                : `${labels.balance}: ${formatCents(totals.balanceCents)}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            withValid(() => {
              setScreen('preview');
            });
          }}
          className="btn-cond flex min-h-14 items-center gap-2 rounded-field bg-orange-400 px-5 text-[22px] text-ink hover:bg-orange-300"
        >
          <FileIcon strokeWidth={1.75} /> Ver PDF
        </button>
      </div>
      {dialogs}
    </div>
  );
}
