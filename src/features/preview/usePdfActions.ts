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

  const run = async <T>(
    kind: 'share' | 'download',
    doc: DocumentData,
    then: (pdf: { blob: Blob; fileName: string }) => Promise<T> | T,
  ): Promise<T | undefined> => {
    setBusy(kind);
    setError(null);
    try {
      return await then(await renderPdf(doc));
    } catch {
      setError('No se pudo crear el PDF. Inténtalo otra vez.');
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  /** Resolves to 'shared' when the OS share sheet completed, so the app can confirm it. */
  const share = (doc: DocumentData) =>
    run('share', doc, async ({ blob, fileName }) => {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const result = await shareFile(file, fileName);
      if (result === 'unsupported') setFallback({ blob, fileName, doc });
      return result;
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
