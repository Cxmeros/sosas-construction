import { useCallback, useState } from 'react';
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

  const share = useCallback(async (doc: DocumentData) => {
    setBusy('share');
    setError(null);
    try {
      const { blob, fileName } = await renderPdf(doc);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const result = await shareFile(file, fileName);
      if (result === 'unsupported') setFallback({ blob, fileName, doc });
    } catch {
      setError('No se pudo crear el PDF. Inténtalo otra vez.');
    } finally {
      setBusy(null);
    }
  }, []);

  const download = useCallback(async (doc: DocumentData) => {
    setBusy('download');
    setError(null);
    try {
      const { blob, fileName } = await renderPdf(doc);
      downloadBlob(blob, fileName);
    } catch {
      setError('No se pudo crear el PDF. Inténtalo otra vez.');
    } finally {
      setBusy(null);
    }
  }, []);

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
