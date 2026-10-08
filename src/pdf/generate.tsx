import { LOGO, WOOD_STRIP } from '../config/logo';
import type { DocumentData } from '../domain/types';
import { buildPdfModel } from './model';

/** Renders the real PDF. @react-pdf/renderer is loaded on demand (CLAUDE.md stack). */
export async function renderPdf(doc: DocumentData): Promise<{ blob: Blob; fileName: string }> {
  const [{ pdf }, { DocumentPdf, registerFonts }, { FONT_FILES }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./DocumentPdf'),
    import('./fonts'),
  ]);
  registerFonts(FONT_FILES);
  const model = buildPdfModel(doc);
  const blob = await pdf(
    <DocumentPdf model={model} logoSrc={LOGO.src} woodSrc={WOOD_STRIP} />,
  ).toBlob();
  return { blob, fileName: model.fileName };
}
