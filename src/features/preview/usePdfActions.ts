import { useState } from 'react';
import type { DocumentData } from '../../domain/types';
import { downloadBlob, shareFile } from '../../lib/share';
import { renderPdf } from '../../pdf/generate';

export interface PdfFile {
  blob: Blob;
  fileName: string;
  doc: DocumentData;
}

/** Share (Web Share API with the file) with the 4b panel as fallback, and download. */
export function usePdfActions() {
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set when the device can't share files: opens the fallback panel. */
  const [fallback, setFallback] = useState<PdfFile | null>(null);

  const run = async (
    kind: 'share' | 'download',
    doc: DocumentData,
    then: (pdf: { blob: Blob; fileName: string }) => Promise<void> | void,
  ) => {
    setBusy(kind);
    setError(null);
    try {
      await then(await renderPdf(doc));
    } catch {
      setError('No se pudo crear el PDF. Inténtalo otra vez.');
    } finally {
      setBusy(null);
    }
  };

  const share = (doc: DocumentData) =>
    run('share', doc, async ({ blob, fileName }) => {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if ((await shareFile(file, fileName)) === 'unsupported') setFallback({ blob, fileName, doc });
    });

  const download = (doc: DocumentData) =>
    run('download', doc, ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
    });

  return {
    busy,
    error,
    clearError: () => {
      setError(null);
    },
    fallback,
    closeFallback: () => {
      setFallback(null);
    },
    share,
    download,
  };
}
