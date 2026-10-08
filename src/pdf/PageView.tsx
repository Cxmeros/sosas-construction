import type { CSSProperties, ReactNode } from 'react';
import { COLORS as C, COMPANY, OWNERS_LINE } from '../config/company';
import { formatCents } from '../domain/money';
import logoUrl from '../assets/logo-placeholder.png';
import { BAR, BOX, CELL, COLS, COLUMNS, PAGE, TABLE_GAP, TYPE } from './layout';
import type { PdfPage, PdfSegment } from './layout';
import type { PdfModel, PdfOption, PdfRow } from './model';

/**
 * HTML twin of DocumentPdf, at 816 × 1056 CSS px (Letter at 96 dpi), for the live preview.
 * Same model, same page breaks; the real PDF is rendered by DocumentPdf.
 */

const cond: CSSProperties = {
  fontFamily: "'Barlow Condensed', Barlow, sans-serif",
  fontWeight: 700,
};
/** Solid orange bar + pale orange box, as in Danilo's original estimate (mirrors DocumentPdf). */
const bar: CSSProperties = {
  ...cond,
  fontSize: TYPE.label,
  letterSpacing: '0.1em',
  color: '#FFFFFF',
  background: C.orange600,
  lineHeight: TYPE.lineHeight,
  padding: `${String(BAR.padY)}px ${String(BAR.padX)}px`,
};
const box: CSSProperties = {
  background: C.orange100,
  padding: `${String(BOX.padY)}px ${String(BOX.padX)}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: BOX.gap,
};
const gridLine = `1px solid ${C.orange200}`;
const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0,1fr) ${String(COLS.qty)}px ${String(COLS.unit)}px ${String(COLS.unitPrice)}px ${String(COLS.amount)}px`,
};
const cell = (align: 'left' | 'right', first = false): CSSProperties => ({
  padding: `${String(CELL.padY)}px ${String(CELL.padX)}px`,
  textAlign: align,
  boxSizing: 'border-box',
  ...(first ? {} : { borderLeft: gridLine }),
});

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
        borderBottom: `3px solid ${C.orange500}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={logoUrl} alt={COMPANY.name} style={{ height: 92, display: 'block' }} />
        <div
          style={{
            borderLeft: `1px solid ${C.lineSoft}`,
            paddingLeft: 14,
            fontSize: TYPE.company,
            lineHeight: TYPE.lineHeight,
            color: C.inkMuted,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <strong style={{ color: C.ink, fontSize: 13 }}>{OWNERS_LINE}</strong>
          <span>{COMPANY.addressLine1}</span>
          <span>{COMPANY.addressLine2}</span>
          {COMPANY.phones.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div
          style={{
            ...cond,
            fontSize: TYPE.title,
            lineHeight: 0.95,
            color: C.orange600,
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
      <span style={{ fontWeight: 600 }}>{v}</span>
    </>
  );
}

function CompactHeader({ model }: { model: PdfModel }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottom: `3px solid ${C.orange500}`,
      }}
    >
      <img src={logoUrl} alt={COMPANY.name} style={{ height: 48, display: 'block' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span
          style={{
            ...cond,
            fontSize: TYPE.compactTitle,
            lineHeight: 1,
            color: C.orange600,
            letterSpacing: '0.02em',
          }}
        >
          {model.title} <span style={{ color: C.inkMuted, fontWeight: 600 }}>(continued)</span>
        </span>
        <span style={{ fontSize: TYPE.meta, fontWeight: 600 }}>
          No. {model.number} · {model.date} · {model.customer.name}
        </span>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={bar}>{label}</span>
      <div style={box}>{children}</div>
    </div>
  );
}

function Row({ row }: { row: PdfRow }) {
  return (
    <div
      style={{
        ...grid,
        borderLeft: gridLine,
        borderRight: gridLine,
        borderBottom: gridLine,
        alignItems: 'stretch',
      }}
    >
      <span style={{ ...cell('left', true), display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 500 }}>{row.description}</span>
        {row.note && <span style={{ fontSize: TYPE.note, color: C.inkMuted }}>{row.note}</span>}
      </span>
      <span style={cell('right')}>{row.qty}</span>
      <span style={cell('left')}>{row.unit}</span>
      <span style={cell('right')}>{row.unitPrice}</span>
      <span style={{ ...cell('right'), fontWeight: 600 }}>{row.amount}</span>
    </div>
  );
}

function TableHead() {
  return (
    <div
      style={{
        ...grid,
        border: gridLine,
        background: C.orange100,
        color: C.orange800,
        fontWeight: 700,
        fontSize: TYPE.tableHead,
        letterSpacing: '0.08em',
      }}
    >
      <span style={cell('left', true)}>DESCRIPTION</span>
      <span style={cell('right')}>QTY</span>
      <span style={cell('left')}>UNIT</span>
      <span style={cell('right')}>UNIT PRICE</span>
      <span style={cell('right')}>AMOUNT</span>
    </div>
  );
}

function Totals({ option, full = false }: { option: PdfOption; full?: boolean }) {
  return (
    <div
      style={{
        alignSelf: full ? 'stretch' : 'flex-end',
        width: full ? 'auto' : 340,
        display: 'flex',
        flexDirection: 'column',
        border: `1.5px solid ${C.orange200}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '9px 14px',
          fontSize: TYPE.totalsTotal,
          fontWeight: 700,
        }}
      >
        <span>{option.shortLabel ? `${option.shortLabel} total` : 'Total'}</span>
        <span>{option.total}</span>
      </div>
      {option.deposit && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '9px 14px',
            borderTop: `1px solid ${C.orange200}`,
            fontSize: TYPE.totalsRow,
          }}
        >
          <span>{option.deposit.label}</span>
          <span style={{ fontWeight: 600 }}>{option.deposit.value}</span>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
          padding: '11px 14px',
          borderTop: `2px solid ${C.orange600}`,
          background: C.orange600,
          color: '#FFFFFF',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: TYPE.totalsRow }}>{option.balanceLabel}</span>
        <span style={{ ...cond, fontSize: TYPE.balance, lineHeight: 1 }}>{option.balance}</span>
      </div>
    </div>
  );
}

const columnGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0,1fr) ${String(COLUMNS.amount)}px`,
};

/** Two-option layout: one option as a card, like a side-by-side comparison. */
function OptionCard({ option }: { option: PdfOption }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <span style={bar}>{option.shortLabel.toUpperCase()}</span>
      {(option.title || option.description) && (
        <div style={box}>
          {option.title && (
            <strong style={{ fontSize: TYPE.customerName, lineHeight: TYPE.lineHeight }}>
              {option.title}
            </strong>
          )}
          {option.description && (
            <span style={{ whiteSpace: 'pre-wrap' }}>{option.description}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: TABLE_GAP }}>
        <div
          style={{
            ...columnGrid,
            border: gridLine,
            background: C.orange100,
            color: C.orange800,
            fontWeight: 700,
            fontSize: TYPE.tableHead,
            letterSpacing: '0.08em',
          }}
        >
          <span style={cell('left', true)}>DESCRIPTION</span>
          <span style={cell('right')}>AMOUNT</span>
        </div>
        {option.rows.map((row) => (
          <div
            key={row.key}
            style={{
              ...columnGrid,
              borderLeft: gridLine,
              borderRight: gridLine,
              borderBottom: gridLine,
            }}
          >
            <span style={{ ...cell('left', true), display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500 }}>{row.description}</span>
              {row.note && (
                <span style={{ fontSize: TYPE.note, color: C.inkMuted }}>{row.note}</span>
              )}
              {row.detail && (
                <span style={{ fontSize: TYPE.note, color: C.inkMuted }}>{row.detail}</span>
              )}
            </span>
            <span style={{ ...cell('right'), fontWeight: 600 }}>{row.amount}</span>
          </div>
        ))}
      </div>
      {/* Pushes both cards' totals to the same line. */}
      <div style={{ flex: '1 0 auto', minHeight: PAGE.gap }} />
      <Totals option={option} full />
    </div>
  );
}

/** One option's part of a page: its bar (and description), table rows, and/or totals. */
function OptionSegment({ option, segment }: { option: PdfOption; segment: PdfSegment }) {
  const continued = segment.header === 'continued';
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={bar}>
          {continued ? `${option.shortLabel || option.label} (continued)` : option.label}
        </span>
        {!continued && option.description && (
          <div style={box}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{option.description}</p>
          </div>
        )}
        {segment.showTable && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: TABLE_GAP }}>
            <TableHead />
            {segment.rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </div>
        )}
      </div>
      {segment.showTotals && <Totals option={option} />}
    </>
  );
}

export function PageView({ model, page }: { model: PdfModel; page: PdfPage }) {
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
        gap: PAGE.gap,
        fontSize: TYPE.body,
        lineHeight: TYPE.lineHeight,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      {page.fullHeader ? (
        <>
          <FullHeader model={model} />
          <Section label="CUSTOMER INFORMATION">
            <strong style={{ fontSize: TYPE.customerName }}>{model.customer.name}</strong>
            {model.customer.address && <span>{model.customer.address}</span>}
            {model.customer.contact && <span>{model.customer.contact}</span>}
          </Section>
          {model.jobDescription && (
            <Section label="JOB DESCRIPTION">
              <p style={{ margin: 0, fontSize: TYPE.jobDescription, whiteSpace: 'pre-wrap' }}>
                {model.jobDescription}
              </p>
            </Section>
          )}
        </>
      ) : (
        <CompactHeader model={model} />
      )}

      {page.columns && (
        <div style={{ display: 'flex', gap: COLUMNS.gap, alignItems: 'stretch' }}>
          {model.options.map((option) => (
            <OptionCard key={option.key} option={option} />
          ))}
        </div>
      )}
      {!page.columns &&
        page.segments.map((segment) => {
          const option = model.options[segment.option];
          if (!option) return null;
          return (
            <OptionSegment
              key={`${option.key}-${segment.header}`}
              option={option}
              segment={segment}
            />
          );
        })}

      {page.continued && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: TYPE.note,
            color: C.inkMuted,
          }}
        >
          <span>
            {page.continued.subtotalCents !== null && (
              <>
                Subtotal this page:{' '}
                <strong style={{ color: C.ink }}>
                  {formatCents(page.continued.subtotalCents)}
                </strong>
              </>
            )}
          </span>
          <strong style={{ color: C.ink }}>Continued on page {page.continued.nextPage} ›</strong>
        </div>
      )}

      {page.showTerms && (
        <Section label="TERMS AND CONDITIONS">
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
        </Section>
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
