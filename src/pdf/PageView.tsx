import type { CSSProperties, ReactNode } from 'react';
import { COLORS as C, COMPANY } from '../config/company';
import { formatCents } from '../domain/money';
import logoUrl from '../assets/logo-placeholder.png';
import { Corners } from '../ui/Corners';
import { COLS, PAGE, TYPE } from './layout';
import type { PdfPage } from './layout';
import type { PdfModel, PdfRow } from './model';

/**
 * HTML twin of DocumentPdf, at 816 × 1056 CSS px (Letter at 96 dpi), for the live preview.
 * Same model, same page breaks; the real PDF is rendered by DocumentPdf.
 */

const cond: CSSProperties = {
  fontFamily: "'Barlow Condensed', Barlow, sans-serif",
  fontWeight: 700,
};
const sectionLabel: CSSProperties = {
  ...cond,
  fontSize: TYPE.label,
  letterSpacing: '0.1em',
  color: C.orange700,
  lineHeight: TYPE.lineHeight,
};
const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0,1fr) ${String(COLS.qty)}px ${String(COLS.unit)}px ${String(COLS.unitPrice)}px ${String(COLS.amount)}px`,
};
const cell = (align: 'left' | 'right', first = false, last = false): CSSProperties => ({
  padding: `7px ${last ? 0 : 6}px 7px ${first ? 0 : 6}px`,
  textAlign: align,
  ...(first ? { paddingRight: 8 } : {}),
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
          <strong style={{ color: C.ink, fontSize: 13 }}>{COMPANY.owner}</strong>
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
            color: C.orange700,
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
            color: C.orange700,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ ...sectionLabel, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Row({ row }: { row: PdfRow }) {
  return (
    <div style={{ ...grid, borderBottom: `1px solid ${C.lineSoft}`, alignItems: 'baseline' }}>
      <span style={{ ...cell('left', true), display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 500 }}>{row.description}</span>
        {row.note && <span style={{ fontSize: TYPE.note, color: C.inkMuted }}>{row.note}</span>}
      </span>
      <span style={cell('right')}>{row.qty}</span>
      <span style={cell('left')}>{row.unit}</span>
      <span style={cell('right')}>{row.unitPrice}</span>
      <span style={{ ...cell('right', false, true), fontWeight: 600 }}>{row.amount}</span>
    </div>
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
          <div
            className="blueprint"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '12px 14px',
              border: `1.5px solid ${C.ink}`,
            }}
          >
            <Corners />
            <span style={sectionLabel}>CUSTOMER INFORMATION</span>
            <strong style={{ fontSize: TYPE.customerName }}>{model.customer.name}</strong>
            {model.customer.address && <span>{model.customer.address}</span>}
            {model.customer.contact && <span>{model.customer.contact}</span>}
          </div>
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

      {page.showTable && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...sectionLabel, paddingBottom: 6 }}>SERVICES AND MATERIALS</span>
          <div
            style={{
              ...grid,
              borderTop: `2px solid ${C.ink}`,
              borderBottom: `1px solid ${C.ink}`,
              fontWeight: 700,
              fontSize: TYPE.tableHead,
              letterSpacing: '0.08em',
            }}
          >
            <span style={cell('left', true)}>DESCRIPTION</span>
            <span style={cell('right')}>QTY</span>
            <span style={cell('left')}>UNIT</span>
            <span style={cell('right')}>UNIT PRICE</span>
            <span style={cell('right', false, true)}>AMOUNT</span>
          </div>
          {page.rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
          {page.continued && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                fontSize: TYPE.note,
                color: C.inkMuted,
              }}
            >
              <span>
                Subtotal this page:{' '}
                <strong style={{ color: C.ink }}>
                  {formatCents(page.continued.subtotalCents)}
                </strong>
              </span>
              <strong style={{ color: C.ink }}>
                Continued on page {page.continued.nextPage} ›
              </strong>
            </div>
          )}
        </div>
      )}

      {page.showTotals && (
        <>
          <div
            className="blueprint"
            style={{
              alignSelf: 'flex-end',
              width: 340,
              display: 'flex',
              flexDirection: 'column',
              border: `1.5px solid ${C.ink}`,
            }}
          >
            <Corners />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 14px',
                fontSize: TYPE.totalsTotal,
                fontWeight: 700,
              }}
            >
              <span>Total</span>
              <span>{model.total}</span>
            </div>
            {model.deposit && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                padding: '11px 14px',
                borderTop: `2px solid ${C.ink}`,
                background: C.orange100,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: TYPE.totalsRow }}>
                {model.balanceLabel}
              </span>
              <span style={{ ...cond, fontSize: TYPE.balance, lineHeight: 1 }}>
                {model.balance}
              </span>
            </div>
          </div>
          {model.terms && (
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
        </>
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
