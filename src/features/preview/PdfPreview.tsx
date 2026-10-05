import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DocumentData } from '../../domain/types';
import { paginate, PAGE } from '../../pdf/layout';
import { buildPdfModel } from '../../pdf/model';
import { PageView } from '../../pdf/PageView';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);
  return [ref, width] as const;
}

/** Live preview: the PDF pages as HTML, scaled to the available width. */
export function PdfPreview({
  doc,
  maxWidth = PAGE.width,
  pageLabel,
}: {
  doc: DocumentData;
  maxWidth?: number;
  pageLabel?: (pageNo: number, pageCount: number) => string;
}) {
  const [ref, available] = useWidth<HTMLDivElement>();
  const model = useMemo(() => buildPdfModel(doc), [doc]);
  const pages = useMemo(() => paginate(model), [model]);
  const width = Math.min(available, maxWidth);
  const scale = width / PAGE.width;

  return (
    <div
      ref={ref}
      className="flex w-full flex-col items-center gap-3"
      aria-label="Vista previa del PDF"
    >
      {width > 0 &&
        pages.map((page) => (
          <div key={page.pageNo} className="flex flex-col items-center gap-2">
            <div
              className="flex-none overflow-hidden bg-white shadow-[0_3px_10px_rgba(0,0,0,0.35)]"
              style={{ width, height: PAGE.height * scale }}
            >
              <div
                style={{
                  width: PAGE.width,
                  transform: `scale(${String(scale)})`,
                  transformOrigin: '0 0',
                }}
              >
                <PageView model={model} page={page} />
              </div>
            </div>
            {pageLabel && (
              <span className="text-[13px] text-oak-300">
                {pageLabel(page.pageNo, page.pageCount)}
              </span>
            )}
          </div>
        ))}
    </div>
  );
}

export function pageCountOf(doc: DocumentData): number {
  return paginate(buildPdfModel(doc)).length;
}
