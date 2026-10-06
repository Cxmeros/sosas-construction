import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { saveDraft } from './lib/storage';
import { ConfirmDialog } from './ui/Dialog';
import { CheckIcon, FileIcon, FilePlusIcon, UndoIcon } from './ui/Icons';
import { NoticeToast, type Notice } from './ui/NoticeToast';
import { UpdateBar } from './ui/UpdateBar';
import { useIsDesktop } from './ui/useMediaQuery';

function SavedIndicator({ savedAt, short = false }: { savedAt: number | null; short?: boolean }) {
  if (savedAt === null) return null;
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
      <CheckIcon size={18} /> {short ? 'Guardado' : 'Borrador guardado'}
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
  const [notice, setNotice] = useState<Notice | null>(null);
  const formScroll = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);

  useEffect(() => {
    if (!notice) return;
    // Give follow-up actions time to be read and reached one-handed.
    const t = setTimeout(
      () => {
        setNotice(null);
      },
      notice.action ? 10_000 : 5000,
    );
    return () => {
      clearTimeout(t);
    };
  }, [notice]);

  // "Editar" returns to where Danilo left the form, not to the top.
  useLayoutEffect(() => {
    if (screen === 'form' && formScroll.current) formScroll.current.scrollTop = savedScroll.current;
  }, [screen]);

  /** Runs `fn` with the validated document; otherwise shows the errors next to each field. */
  const withValid = (fn: (d: DocumentData) => void) => {
    void form.handleSubmit(fn, () => {
      setScreen('form');
    })();
  };

  const askNew = () => {
    setConfirm('new');
  };
  const share = () => {
    withValid((d) => {
      void actions.share(d).then((result) => {
        if (result === 'shared')
          setNotice({
            text: 'PDF compartido.',
            action: { label: 'Nuevo documento', run: askNew },
          });
      });
    });
  };
  const download = () => {
    withValid((d) => void actions.download(d));
  };
  const convert = () => {
    const { number, askDeposit } = state.convertToInvoice();
    setNotice({
      text: askDeposit
        ? `Ahora es el Invoice ${number}. Indica el monto del anticipo recibido.`
        : `Ahora es el Invoice ${number}.`,
      action: { label: 'Deshacer', run: state.undoConvert },
    });
    if (askDeposit) {
      // The one question an invoice needs answered: what was actually paid.
      setScreen('form');
      setTimeout(() => {
        form.setFocus('depositFixed', { shouldSelect: true });
      }, 50);
    }
  };
  const startNew = () => {
    state.newDocument();
    setConfirm(null);
    setNotice(null);
    savedScroll.current = 0;
    setScreen('form');
  };
  const openPreview = () => {
    withValid(() => {
      savedScroll.current = formScroll.current?.scrollTop ?? 0;
      setScreen('preview');
    });
  };

  const docLabel = doc.type === 'invoice' ? 'Invoice' : 'Work Estimate';
  const labels = depositLabels(doc.type === 'invoice', doc);
  const docName = `${doc.type === 'invoice' ? 'el Invoice' : 'el Estimate'} ${doc.number}${doc.customer.name ? ` de ${doc.customer.name}` : ''}`;

  const recoveredWhat = recovered
    ? recovered.values.customer.name.trim() ||
      recovered.values.items.find((i) => i.description.trim())?.description.trim() ||
      'sin cliente todavía'
    : '';
  // Non-blocking: the form stays usable; this only offers a clean start.
  const recoveredBanner = recovered && (
    <div
      role="status"
      className="flex flex-none flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-gold-500 bg-cream py-2 pr-2 pl-4"
    >
      <div className="flex min-w-0 flex-1 basis-60 gap-2.5 text-walnut-700">
        <UndoIcon className="mt-0.5 flex-none" />
        <div className="flex min-w-0 flex-col">
          <strong className="text-[15px]">Recuperamos tu borrador</strong>
          <span className="truncate text-sm">
            {recovered.values.type === 'invoice' ? 'Invoice' : 'Estimate'} {recovered.values.number}{' '}
            · {recoveredWhat} · {formatSavedAt(recovered.savedAt)}
          </span>
        </div>
      </div>
      <div className="ml-auto flex gap-1">
        <button
          type="button"
          onClick={() => {
            setConfirm('discard');
          }}
          className="min-h-12 flex-none rounded-field px-3 text-[15px] font-semibold text-walnut-700 underline underline-offset-4 hover:bg-surface"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={state.keepRecovered}
          className="min-h-12 flex-none rounded-field bg-walnut-700 px-3.5 text-[15px] font-bold text-white hover:bg-walnut-900"
        >
          Seguir editando
        </button>
      </div>
    </div>
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'discard' ? '¿Descartar el borrador?' : '¿Empezar un documento nuevo?'}
        message={`Se borrará ${docName} de este aparato. Si ya lo enviaste, el cliente conserva su PDF. Esto no se puede deshacer.`}
        confirmLabel={confirm === 'discard' ? 'Sí, descartar' : 'Sí, empezar nuevo'}
        onConfirm={startNew}
        onCancel={() => {
          setConfirm(null);
        }}
      />
      <SharePanel file={actions.fallback} onClose={actions.closeFallback} />
      <UpdateBar
        beforeUpdate={() => {
          saveDraft(form.getValues());
        }}
      />
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

  const clearNotice = () => {
    setNotice(null);
  };

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
            <h1 className="m-0 font-cond text-[22px] leading-tight font-bold text-walnut-900 uppercase">
              {docLabel} {doc.number}
            </h1>
            <SavedIndicator savedAt={savedAt} />
          </div>
          {/* Starting over wipes the draft, so it sits apart from the export actions. */}
          <button
            type="button"
            className="flex min-h-12 items-center gap-2 rounded-field border-[1.5px] border-walnut-700 bg-surface px-4 text-base font-semibold text-walnut-700 hover:bg-cream"
            onClick={askNew}
          >
            <FilePlusIcon size={20} />
            Nuevo documento
          </button>
          <div className="flex-1" />
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
            className="btn-cond min-h-12 rounded-field bg-orange-700 px-[22px] text-xl text-white hover:bg-orange-800 disabled:opacity-70"
          >
            {actions.busy === 'share' ? 'Creando…' : 'Compartir'}
          </button>
        </header>
        <NoticeToast
          notice={notice}
          onDone={clearNotice}
          className="fixed top-[84px] right-6 max-w-[520px]"
        />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_440px]">
          <div className="flex min-h-0 flex-col overflow-y-auto">
            {recoveredBanner}
            <main className="scroll-py-6 px-8 pt-6 pb-8">
              <DocumentForm state={state} totals={totals} desktop />
            </main>
          </div>
          <aside className="flex flex-col items-center gap-2.5 overflow-y-auto bg-walnut-400 p-5">
            <div className="flex self-stretch justify-between text-[13px] font-semibold tracking-[0.06em] text-oak-300 uppercase">
              <span>Vista previa en vivo</span>
              <span>Carta · {pages === 1 ? '1 de 1' : `${String(pages)} páginas`}</span>
            </div>
            <PdfPreview doc={doc} maxWidth={400} />
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
          totals={totals}
          busy={actions.busy}
          notice={notice}
          onNoticeDone={clearNotice}
          onBack={() => {
            setScreen('form');
          }}
          onShare={share}
          onDownload={download}
          onConvert={convert}
          onNew={askNew}
        />
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex h-16 flex-none items-center gap-2 border-b border-line-soft bg-surface pr-1 pl-4">
        <img src={logoUrl} alt={COMPANY.name} className="block h-10" />
        <div className="flex-1" />
        <SavedIndicator savedAt={savedAt} short />
        <button
          type="button"
          onClick={askNew}
          aria-label="Nuevo documento"
          className="flex min-h-12 items-center gap-1.5 rounded-field px-2.5 text-[15px] font-semibold text-walnut-700 hover:bg-cream"
        >
          <FilePlusIcon size={20} /> Nuevo
        </button>
      </header>
      {recoveredBanner}
      <NoticeToast notice={notice} onDone={clearNotice} className="flex-none" />
      <main ref={formScroll} className="flex-1 scroll-py-6 overflow-y-auto px-4 pt-4 pb-6">
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
              ? doc.items.length > 0
                ? 'Completa los trabajos'
                : 'Agrega trabajos'
              : doc.deposit.mode === 'none'
                ? 'Sin anticipo'
                : `${labels.balance}: ${formatCents(totals.balanceCents)}`}
          </span>
        </div>
        <button
          type="button"
          onClick={openPreview}
          className="btn-cond flex min-h-14 items-center gap-2 rounded-field bg-orange-400 px-5 text-[22px] text-ink hover:bg-orange-300"
        >
          <FileIcon strokeWidth={1.75} /> Ver PDF
        </button>
      </div>
      {dialogs}
    </div>
  );
}
