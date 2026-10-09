import type { CSSProperties, ReactNode } from 'react';
import { COLORS as C, COMPANY, LOGO } from '../config/company';
import { formatCents } from '../domain/money';
import {
  COLS,
  CUSTOMER,
  EXTRAS,
  LOGO_HEIGHT,
  PAGE,
  STEP,
  TYPE,
  type DocPage,
  type PdfPage,
  type ProcessPage,
} from './layout';
import type { PdfModel, PdfRow } from './model';

/**
 * HTML twin of DocumentPdf, at 816 × 1056 CSS px (Letter at 96 dpi), for the live preview.
 * Same model, same page breaks (layout.ts); the real PDF is rendered by DocumentPdf.
 */

const cond: CSSProperties = {
  fontFamily: "'Barlow Condensed', Barlow, sans-serif",
  fontWeight: 700,
};
const label: CSSProperties = {
  ...cond,
  fontSize: TYPE.label,
  letterSpacing: '0.08em',
  color: C.red700,
  lineHeight: TYPE.lineHeight,
};
const ruled: CSSProperties = { ...label, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 };
const tabular: CSSProperties = { fontVariantNumeric: 'tabular-nums' };
const columns = (simple: boolean) =>
  simple
    ? `minmax(0,1fr) ${String(COLS.simpleAmount)}px`
    : `minmax(0,1fr) ${String(COLS.qty)}px ${String(COLS.unit)}px ${String(COLS.unitPrice)}px ${String(COLS.amount)}px`;

function Logo({ height }: { height: number }) {
  return <img src={LOGO.src} alt={COMPANY.name} style={{ height, display: 'block' }} />;
}

function FullHeader({ model }: { model: PdfModel }) {
  const meta: [string, string][] = [
    ['NO.', model.number],
    ['DATE', model.date],
  ];
  if (model.estimateRef) meta.push(['ESTIMATE REF.', model.estimateRef]);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 24,
        paddingBottom: 14,
        borderBottom: `3px solid ${C.red500}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <Logo height={LOGO_HEIGHT.full} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            fontSize: TYPE.company,
            lineHeight: 1.35,
            paddingBottom: 2,
          }}
        >
          <strong style={{ ...cond, fontSize: TYPE.owners, color: C.ink, lineHeight: 1.1 }}>
            {COMPANY.owners}
          </strong>
          <span style={{ color: C.inkMuted }}>{COMPANY.name}</span>
          <span style={{ color: C.inkMuted }}>{COMPANY.address}</span>
          <span style={tabular}>{COMPANY.phones.join(' · ')}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div
          style={{
            ...cond,
            fontSize: TYPE.title,
            lineHeight: 0.95,
            color: C.red700,
            letterSpacing: '0.02em',
          }}
        >
          {model.title}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '2px 14px',
            fontSize: TYPE.meta,
            textAlign: 'right',
          }}
        >
          {meta.map(([k, v]) => (
            <Meta key={k} k={k} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span style={{ fontWeight: 700, letterSpacing: '0.06em', color: C.inkMuted }}>{k}</span>
      <span style={{ fontWeight: 600, ...tabular }}>{v}</span>
    </>
  );
}

function CompactHeader({ model, tag }: { model: PdfModel; tag: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottom: `3px solid ${C.red500}`,
      }}
    >
      <Logo height={LOGO_HEIGHT.compact} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span
          style={{
            ...cond,
            fontSize: TYPE.compactTitle,
            lineHeight: 1,
            color: C.red700,
            letterSpacing: '0.02em',
          }}
        >
          {model.title} <span style={{ color: C.inkMuted, fontWeight: 600 }}>{tag}</span>
        </span>
        <span style={{ fontSize: TYPE.meta, fontWeight: 600, ...tabular }}>
          No. {model.number} · {model.date} · {model.customer.name}
        </span>
      </div>
    </div>
  );
}

function Customer({ model }: { model: PdfModel }) {
  const c = model.customer;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)',
        gap: `2px ${String(CUSTOMER.colGap)}px`,
        padding: `${String(CUSTOMER.padY)}px ${String(CUSTOMER.padX)}px`,
        border: `1.5px solid ${C.ink}`,
      }}
    >
      <span style={{ ...label, gridColumn: '1 / -1', paddingBottom: 2 }}>CUSTOMER INFORMATION</span>
      <strong style={{ fontSize: TYPE.customerName }}>{c.name}</strong>
      <span style={tabular}>{c.phone}</span>
      <span>{c.address}</span>
      <span>{c.email}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={ruled}>{title}</span>
      {children}
    </div>
  );
}

function Row({ row, simple }: { row: PdfRow; simple: boolean }) {
  const pad = simple ? '8px' : '7px';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns(simple),
        borderBottom: `1px solid ${C.lineSoft}`,
        alignItems: 'baseline',
        ...tabular,
      }}
    >
      <span style={{ padding: `${pad} 8px ${pad} 0`, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 500 }}>{row.description}</span>
        {row.note && <span style={{ fontSize: TYPE.note, color: C.inkMuted }}>{row.note}</span>}
      </span>
      {!simple && (
        <>
          <span style={{ padding: '7px 6px', textAlign: 'right' }}>{row.qty}</span>
          <span style={{ padding: '7px 6px' }}>{row.unit}</span>
          <span style={{ padding: '7px 6px', textAlign: 'right' }}>{row.unitPrice}</span>
        </>
      )}
      <span style={{ padding: `${pad} 0 ${pad} 6px`, textAlign: 'right', fontWeight: 600 }}>
        {row.amount}
      </span>
    </div>
  );
}

function Table({ model, page }: { model: PdfModel; page: DocPage }) {
  const head: CSSProperties = { padding: '7px 6px' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ ...label, paddingBottom: 6 }}>SERVICES AND MATERIALS</span>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns(model.simple),
          borderTop: `2px solid ${C.ink}`,
          borderBottom: `1px solid ${C.ink}`,
          fontWeight: 700,
          fontSize: TYPE.tableHead,
          letterSpacing: '0.08em',
        }}
      >
        <span style={{ ...head, paddingLeft: 0, paddingRight: 8 }}>DESCRIPTION</span>
        {!model.simple && (
          <>
            <span style={{ ...head, textAlign: 'right' }}>QTY</span>
            <span style={head}>UNIT</span>
            <span style={{ ...head, textAlign: 'right' }}>UNIT PRICE</span>
          </>
        )}
        <span style={{ ...head, paddingRight: 0, textAlign: 'right' }}>AMOUNT</span>
      </div>
      {page.rows.map((row) => (
        <Row key={row.key} row={row} simple={model.simple} />
      ))}
      {page.continued && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 8,
            fontSize: TYPE.note,
            color: C.inkMuted,
            ...tabular,
          }}
        >
          <span>
            Subtotal this page:{' '}
            <strong style={{ color: C.ink }}>{formatCents(page.continued.subtotalCents)}</strong>
          </span>
          <strong style={{ color: C.ink }}>Continued on page {page.continued.nextPage} →</strong>
        </div>
      )}
    </div>
  );
}

function Extras({ model }: { model: PdfModel }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: `1px dashed ${C.fieldBorder}`,
        padding: `${String(EXTRAS.padTop)}px ${String(EXTRAS.padX)}px ${String(EXTRAS.padBottom)}px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingBottom: 4,
        }}
      >
        <span style={label}>ADDITIONAL CHARGES</span>
        <span style={{ fontSize: 12, color: C.inkMuted }}>
          Not included in the original estimate
        </span>
      </div>
      {model.extras.map((x) => (
        <div
          key={x.key}
          style={{
            display: 'grid',
            gridTemplateColumns: `minmax(0,1fr) ${String(COLS.simpleAmount)}px`,
            borderTop: `1px solid ${C.lineSoft}`,
            ...tabular,
          }}
        >
          <span style={{ padding: '4px 8px 4px 0', fontWeight: 500 }}>{x.description}</span>
          <span style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600 }}>{x.amount}</span>
        </div>
      ))}
    </div>
  );
}

function Totals({ model }: { model: PdfModel }) {
  const line: CSSProperties = { display: 'flex', justifyContent: 'space-between' };
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        width: 380,
        display: 'flex',
        flexDirection: 'column',
        border: `1.5px solid ${C.ink}`,
        ...tabular,
      }}
    >
      {model.subtotals && (
        <>
          <div style={{ ...line, padding: '4px 14px' }}>
            <span>Work</span>
            <span>{model.subtotals.work}</span>
          </div>
          <div style={{ ...line, padding: '4px 14px', borderTop: `1px solid ${C.line}` }}>
            <span>Additional charges</span>
            <span>{model.subtotals.extras}</span>
          </div>
        </>
      )}
      <div
        style={{
          ...line,
          padding: '7px 14px',
          fontSize: TYPE.totalsTotal,
          fontWeight: 700,
          borderTop: model.subtotals ? `2px solid ${C.ink}` : undefined,
        }}
      >
        <span>Total</span>
        <span>{model.total}</span>
      </div>
      {model.deposit && (
        <div
          style={{
            ...line,
            padding: '7px 14px',
            borderTop: `1px solid ${C.line}`,
            fontSize: TYPE.totalsRow,
          }}
        >
          <span>{model.deposit.label}</span>
          <span style={{ fontWeight: 600 }}>{model.deposit.value}</span>
        </div>
      )}
      <div
        style={{
          ...line,
          alignItems: 'baseline',
          gap: 12,
          padding: '10px 14px',
          margin: '0 -1.5px -1.5px',
          background: C.red700,
          color: '#FFFFFF',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: TYPE.totalsRow, letterSpacing: '0.02em' }}>
          {model.balanceLabel}
        </span>
        <span style={{ ...cond, fontSize: TYPE.balance, lineHeight: 1 }}>{model.balance}</span>
      </div>
    </div>
  );
}

function DocumentPage({
  model,
  page,
  processPage,
}: {
  model: PdfModel;
  page: DocPage;
  processPage: number | null;
}) {
  return (
    <>
      {page.fullHeader ? (
        <>
          <FullHeader model={model} />
          <Customer model={model} />
          {(model.jobDescription || processPage) && (
            <Section title="JOB DESCRIPTION">
              {model.jobDescription && (
                <p style={{ margin: 0, fontSize: TYPE.jobDescription, whiteSpace: 'pre-wrap' }}>
                  {model.jobDescription}
                </p>
              )}
              {processPage && (
                <p style={{ margin: 0, color: C.inkMuted }}>
                  Step-by-step work process on page {processPage}.
                </p>
              )}
            </Section>
          )}
        </>
      ) : (
        <CompactHeader model={model} tag="(continued)" />
      )}
      {page.showTable && <Table model={model} page={page} />}
      {page.showTotals && (
        <>
          {model.extras.length > 0 && <Extras model={model} />}
          <Totals model={model} />
          {model.terms && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={ruled}>TERMS AND CONDITIONS</span>
              <p
                style={{
                  margin: 0,
                  fontSize: TYPE.terms,
                  color: C.walnut700,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {model.terms}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ProcessView({ model, page }: { model: PdfModel; page: ProcessPage }) {
  const note = model.process?.note ?? '';
  return (
    <>
      <CompactHeader model={model} tag="· Work process" />
      {page.first && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
          <span
            style={{
              ...cond,
              fontSize: TYPE.processTitle,
              lineHeight: 1,
              color: C.red700,
              letterSpacing: '0.02em',
            }}
          >
            WORK PROCESS
          </span>
          {note && (
            <p
              style={{
                margin: 0,
                fontSize: TYPE.jobDescription,
                lineHeight: TYPE.processLineHeight,
                maxWidth: STEP.textWidth,
                whiteSpace: 'pre-wrap',
              }}
            >
              {note}
            </p>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', borderTop: `2px solid ${C.ink}` }}>
        {page.steps.map((step) => (
          <div
            key={step.key}
            style={{
              display: 'grid',
              gridTemplateColumns: `${String(STEP.numberCol)}px minmax(0,1fr)`,
              gap: `0 ${String(STEP.colGap)}px`,
              padding: `${String(STEP.padY)}px 0`,
              borderBottom: `1px solid ${C.lineSoft}`,
            }}
          >
            <span
              style={{
                ...cond,
                fontSize: TYPE.stepNumber,
                lineHeight: 1,
                color: C.red700,
                ...tabular,
              }}
            >
              {step.nn}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {step.title && (
                <strong style={{ fontSize: TYPE.stepTitle, lineHeight: 1.25 }}>{step.title}</strong>
              )}
              {step.body && (
                <p
                  style={{
                    margin: 0,
                    lineHeight: TYPE.processLineHeight,
                    color: C.walnut700,
                    maxWidth: STEP.textWidth,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {step.body}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function PageView({
  model,
  page,
  processPage,
}: {
  model: PdfModel;
  page: PdfPage;
  /** Where the work process starts, for the note on page 1. */
  processPage: number | null;
}) {
  return (
    <div
      className="pdf-page"
      style={{
        width: PAGE.width,
        height: PAGE.height,
        background: '#FFFFFF',
        color: C.ink,
        padding: `${String(PAGE.padTop)}px ${String(PAGE.padX)}px 0`,
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: model.extras.length ? PAGE.gapWithExtras : PAGE.gap,
        fontSize: TYPE.body,
        lineHeight: TYPE.lineHeight,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      {page.kind === 'document' ? (
        <DocumentPage model={model} page={page} processPage={processPage} />
      ) : (
        <ProcessView model={model} page={page} />
      )}
      <div
        style={{
          position: 'absolute',
          left: PAGE.padX,
          right: PAGE.padX,
          bottom: PAGE.footerBottom,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          fontSize: TYPE.footer,
          color: C.inkMuted,
          borderTop: `1px solid ${C.line}`,
          paddingTop: 8,
          ...tabular,
        }}
      >
        <span>{model.footer.left}</span>
        <span>{model.footer.center}</span>
        <strong style={{ color: C.ink }}>
          Page {page.pageNo} of {page.pageCount}
        </strong>
      </div>
    </div>
  );
}
