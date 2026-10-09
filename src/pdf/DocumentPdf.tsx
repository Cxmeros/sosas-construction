import {
  Document,
  Font,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  type Styles,
} from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { COLORS as C, COMPANY } from '../config/company';
import { formatCents } from '../domain/money';
import {
  COLS,
  CUSTOMER,
  EXTRAS,
  LOGO_HEIGHT,
  PAGE,
  STEP,
  TYPE,
  paginate,
  processStartPage,
  type DocPage,
  type PdfPage,
  type ProcessPage,
} from './layout';
import type { PdfModel, PdfRow } from './model';

type Style = Styles[string];

/** Design px (96 dpi) → PDF points (72 dpi). */
const pt = (px: number) => px * 0.75;

export interface FontSources {
  barlow: readonly { src: string; fontWeight: number }[];
  condensed: readonly { src: string; fontWeight: number }[];
}

let registered = false;

/** Registers the embedded fonts once. Sources are URLs in the browser, file paths in Node. */
export function registerFonts(sources: FontSources): void {
  if (registered) return;
  Font.register({ family: 'Barlow', fonts: sources.barlow.map((f) => ({ ...f })) });
  Font.register({ family: 'Barlow Condensed', fonts: sources.condensed.map((f) => ({ ...f })) });
  // Never hyphenate customer text.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

/** Mirrors PageView.tsx (design/project/Sosa PDF.dc.html), in points. */
const s = StyleSheet.create({
  page: {
    paddingTop: pt(PAGE.padTop),
    paddingHorizontal: pt(PAGE.padX),
    fontFamily: 'Barlow',
    fontSize: pt(TYPE.body),
    lineHeight: TYPE.lineHeight,
    color: C.ink,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  cond: { fontFamily: 'Barlow Condensed', fontWeight: 700 },
  label: {
    fontFamily: 'Barlow Condensed',
    fontWeight: 700,
    fontSize: pt(TYPE.label),
    letterSpacing: pt(TYPE.label) * 0.08,
    color: C.red700,
  },
  ruled: { borderBottomWidth: pt(1), borderBottomColor: C.line, paddingBottom: pt(4) },
  row: { flexDirection: 'row' },
  footer: {
    position: 'absolute',
    left: pt(PAGE.padX),
    right: pt(PAGE.padX),
    bottom: pt(PAGE.footerBottom),
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: pt(TYPE.footer),
    color: C.inkMuted,
    borderTopWidth: pt(1),
    borderTopColor: C.line,
    paddingTop: pt(8),
  },
});

const cell = (width: number, align: 'left' | 'right', padY: number, last = false): Style => ({
  width: pt(width),
  paddingVertical: pt(padY),
  paddingLeft: pt(6),
  paddingRight: last ? 0 : pt(6),
  textAlign: align,
});
const descCell = (padY: number): Style => ({
  flexGrow: 1,
  flexBasis: 0,
  paddingVertical: pt(padY),
  paddingRight: pt(8),
});

function FullHeader({ model, logoSrc }: { model: PdfModel; logoSrc: string }) {
  const meta: [string, string][] = [
    ['NO.', model.number],
    ['DATE', model.date],
  ];
  if (model.estimateRef) meta.push(['ESTIMATE REF.', model.estimateRef]);
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: pt(14),
        borderBottomWidth: pt(3),
        borderBottomColor: C.red500,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: pt(16) }}>
        <Image src={logoSrc} style={{ height: pt(LOGO_HEIGHT.full) }} />
        <View style={{ fontSize: pt(TYPE.company), lineHeight: 1.35, paddingBottom: pt(2) }}>
          <Text style={[s.cond, { fontSize: pt(TYPE.owners), lineHeight: 1.1 }]}>
            {COMPANY.owners}
          </Text>
          <Text style={{ color: C.inkMuted }}>{COMPANY.name}</Text>
          <Text style={{ color: C.inkMuted }}>{COMPANY.address}</Text>
          <Text>{COMPANY.phones.join(' · ')}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: pt(8) }}>
        <Text
          style={[
            s.cond,
            {
              fontSize: pt(TYPE.title),
              lineHeight: 0.95,
              color: C.red700,
              letterSpacing: pt(TYPE.title) * 0.02,
            },
          ]}
        >
          {model.title}
        </Text>
        <View style={{ gap: pt(2) }}>
          {meta.map(([k, v]) => (
            <View
              key={k}
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: pt(14),
                fontSize: pt(TYPE.meta),
              }}
            >
              <Text
                style={{ fontWeight: 700, letterSpacing: pt(TYPE.meta) * 0.06, color: C.inkMuted }}
              >
                {k}
              </Text>
              <Text style={{ fontWeight: 600, minWidth: pt(110), textAlign: 'right' }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CompactHeader({ model, logoSrc, tag }: { model: PdfModel; logoSrc: string; tag: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: pt(10),
        borderBottomWidth: pt(3),
        borderBottomColor: C.red500,
      }}
    >
      <Image src={logoSrc} style={{ height: pt(LOGO_HEIGHT.compact) }} />
      <View style={{ alignItems: 'flex-end', gap: pt(2) }}>
        <Text
          style={[
            s.cond,
            {
              fontSize: pt(TYPE.compactTitle),
              lineHeight: 1,
              color: C.red700,
              letterSpacing: pt(TYPE.compactTitle) * 0.02,
            },
          ]}
        >
          {model.title} <Text style={{ color: C.inkMuted, fontWeight: 600 }}>{tag}</Text>
        </Text>
        <Text style={{ fontSize: pt(TYPE.meta), fontWeight: 600 }}>
          No. {model.number} · {model.date} · {model.customer.name}
        </Text>
      </View>
    </View>
  );
}

function Customer({ model }: { model: PdfModel }) {
  const c = model.customer;
  const left: Style = { flexGrow: 1.3, flexBasis: 0 };
  const right: Style = { flexGrow: 1, flexBasis: 0 };
  return (
    <View
      style={{
        paddingVertical: pt(CUSTOMER.padY),
        paddingHorizontal: pt(CUSTOMER.padX),
        borderWidth: pt(1.5),
        borderColor: C.ink,
        gap: pt(2),
      }}
      wrap={false}
    >
      <Text style={[s.label, { paddingBottom: pt(2) }]}>CUSTOMER INFORMATION</Text>
      <View style={[s.row, { gap: pt(CUSTOMER.colGap) }]}>
        <Text style={[left, { fontSize: pt(TYPE.customerName), fontWeight: 700 }]}>{c.name}</Text>
        <Text style={right}>{c.phone}</Text>
      </View>
      {c.address || c.email ? (
        <View style={[s.row, { gap: pt(CUSTOMER.colGap) }]}>
          <Text style={left}>{c.address}</Text>
          <Text style={right}>{c.email}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Row({ row, simple }: { row: PdfRow; simple: boolean }) {
  const padY = simple ? 8 : 7;
  return (
    <View style={[s.row, { borderBottomWidth: pt(1), borderBottomColor: C.lineSoft }]} wrap={false}>
      <View style={descCell(padY)}>
        <Text style={{ fontWeight: 500 }}>{row.description}</Text>
        {row.note ? (
          <Text style={{ fontSize: pt(TYPE.note), color: C.inkMuted }}>{row.note}</Text>
        ) : null}
      </View>
      {simple ? null : (
        <>
          <Text style={cell(COLS.qty, 'right', padY)}>{row.qty}</Text>
          <Text style={cell(COLS.unit, 'left', padY)}>{row.unit}</Text>
          <Text style={cell(COLS.unitPrice, 'right', padY)}>{row.unitPrice}</Text>
        </>
      )}
      <Text
        style={[
          cell(simple ? COLS.simpleAmount : COLS.amount, 'right', padY, true),
          { fontWeight: 600 },
        ]}
      >
        {row.amount}
      </Text>
    </View>
  );
}

function Table({ model, page }: { model: PdfModel; page: DocPage }) {
  return (
    <View>
      <Text style={[s.label, { paddingBottom: pt(6) }]}>SERVICES AND MATERIALS</Text>
      <View
        style={[
          s.row,
          {
            borderTopWidth: pt(2),
            borderTopColor: C.ink,
            borderBottomWidth: pt(1),
            borderBottomColor: C.ink,
            fontWeight: 700,
            fontSize: pt(TYPE.tableHead),
            letterSpacing: pt(TYPE.tableHead) * 0.08,
          },
        ]}
      >
        <Text style={descCell(7)}>DESCRIPTION</Text>
        {model.simple ? null : (
          <>
            <Text style={cell(COLS.qty, 'right', 7)}>QTY</Text>
            <Text style={cell(COLS.unit, 'left', 7)}>UNIT</Text>
            <Text style={cell(COLS.unitPrice, 'right', 7)}>UNIT PRICE</Text>
          </>
        )}
        <Text style={cell(model.simple ? COLS.simpleAmount : COLS.amount, 'right', 7, true)}>
          AMOUNT
        </Text>
      </View>
      {page.rows.map((row) => (
        <Row key={row.key} row={row} simple={model.simple} />
      ))}
      {page.continued ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: pt(8),
            fontSize: pt(TYPE.note),
            color: C.inkMuted,
          }}
        >
          <Text>
            Subtotal this page:{' '}
            <Text style={{ color: C.ink, fontWeight: 700 }}>
              {formatCents(page.continued.subtotalCents)}
            </Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: pt(4) }}>
            <Text style={{ color: C.ink, fontWeight: 700 }}>
              Continued on page {page.continued.nextPage}
            </Text>
            {/* Barlow (latin subset) has no "→": drawn instead. */}
            <Svg width={pt(10)} height={pt(8)} viewBox="0 0 10 8">
              <Path d="M0 4h8M5 1l3 3-3 3" stroke={C.ink} strokeWidth={1.4} fill="none" />
            </Svg>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Extras({ model }: { model: PdfModel }) {
  return (
    <View
      style={{
        borderWidth: pt(1),
        borderStyle: 'dashed',
        borderColor: C.fieldBorder,
        paddingTop: pt(EXTRAS.padTop),
        paddingBottom: pt(EXTRAS.padBottom),
        paddingHorizontal: pt(EXTRAS.padX),
      }}
      wrap={false}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: pt(4),
        }}
      >
        <Text style={s.label}>ADDITIONAL CHARGES</Text>
        <Text style={{ fontSize: pt(12), color: C.inkMuted }}>
          Not included in the original estimate
        </Text>
      </View>
      {model.extras.map((x) => (
        <View key={x.key} style={[s.row, { borderTopWidth: pt(1), borderTopColor: C.lineSoft }]}>
          <Text style={[descCell(4), { fontWeight: 500 }]}>{x.description}</Text>
          <Text
            style={{
              width: pt(COLS.simpleAmount),
              paddingVertical: pt(4),
              textAlign: 'right',
              fontWeight: 600,
            }}
          >
            {x.amount}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Totals({ model }: { model: PdfModel }) {
  const line: Style = { flexDirection: 'row', justifyContent: 'space-between' };
  return (
    <View
      style={{ alignSelf: 'flex-end', width: pt(380), borderWidth: pt(1.5), borderColor: C.ink }}
      wrap={false}
    >
      {model.subtotals ? (
        <>
          <View style={[line, { paddingVertical: pt(4), paddingHorizontal: pt(14) }]}>
            <Text>Work</Text>
            <Text>{model.subtotals.work}</Text>
          </View>
          <View
            style={[
              line,
              {
                paddingVertical: pt(4),
                paddingHorizontal: pt(14),
                borderTopWidth: pt(1),
                borderTopColor: C.line,
              },
            ]}
          >
            <Text>Additional charges</Text>
            <Text>{model.subtotals.extras}</Text>
          </View>
        </>
      ) : null}
      <View
        style={[
          line,
          {
            paddingVertical: pt(7),
            paddingHorizontal: pt(14),
            fontSize: pt(TYPE.totalsTotal),
            fontWeight: 700,
            borderTopWidth: model.subtotals ? pt(2) : 0,
            borderTopColor: C.ink,
          },
        ]}
      >
        <Text>Total</Text>
        <Text>{model.total}</Text>
      </View>
      {model.deposit ? (
        <View
          style={[
            line,
            {
              paddingVertical: pt(7),
              paddingHorizontal: pt(14),
              borderTopWidth: pt(1),
              borderTopColor: C.line,
              fontSize: pt(TYPE.totalsRow),
            },
          ]}
        >
          <Text>{model.deposit.label}</Text>
          <Text style={{ fontWeight: 600 }}>{model.deposit.value}</Text>
        </View>
      ) : null}
      <View
        style={[
          line,
          {
            alignItems: 'flex-end',
            paddingVertical: pt(10),
            paddingHorizontal: pt(14),
            backgroundColor: C.red700,
            color: '#FFFFFF',
          },
        ]}
      >
        <Text style={{ fontWeight: 700, fontSize: pt(TYPE.totalsRow), paddingBottom: pt(3) }}>
          {model.balanceLabel}
        </Text>
        <Text style={[s.cond, { fontSize: pt(TYPE.balance), lineHeight: 1 }]}>{model.balance}</Text>
      </View>
    </View>
  );
}

function RuledSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: pt(5) }} wrap={false}>
      <Text style={[s.label, s.ruled]}>{label}</Text>
      {children}
    </View>
  );
}

function DocumentPageView({
  model,
  page,
  logoSrc,
  processPage,
  gap,
}: {
  model: PdfModel;
  page: DocPage;
  logoSrc: string;
  processPage: number | null;
  gap: number;
}) {
  return (
    <View style={{ gap: pt(gap) }}>
      {page.fullHeader ? (
        <>
          <FullHeader model={model} logoSrc={logoSrc} />
          <Customer model={model} />
          {model.jobDescription || processPage ? (
            <RuledSection label="JOB DESCRIPTION">
              {model.jobDescription ? (
                <Text style={{ fontSize: pt(TYPE.jobDescription) }}>{model.jobDescription}</Text>
              ) : null}
              {processPage ? (
                <Text style={{ color: C.inkMuted }}>
                  Step-by-step work process on page {processPage}.
                </Text>
              ) : null}
            </RuledSection>
          ) : null}
        </>
      ) : (
        <CompactHeader model={model} logoSrc={logoSrc} tag="(continued)" />
      )}
      {page.showTable ? <Table model={model} page={page} /> : null}
      {page.showTotals ? (
        <>
          {model.extras.length ? <Extras model={model} /> : null}
          <Totals model={model} />
          {model.terms ? (
            <View style={{ gap: pt(6) }} wrap={false}>
              <Text style={[s.label, s.ruled]}>TERMS AND CONDITIONS</Text>
              <Text style={{ fontSize: pt(TYPE.terms), color: C.walnut700 }}>{model.terms}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function ProcessPageView({
  model,
  page,
  logoSrc,
  gap,
}: {
  model: PdfModel;
  page: ProcessPage;
  logoSrc: string;
  gap: number;
}) {
  const note = model.process?.note ?? '';
  const body: Style = {
    fontSize: pt(TYPE.body),
    lineHeight: TYPE.processLineHeight,
    maxWidth: pt(STEP.textWidth),
  };
  return (
    <View style={{ gap: pt(gap) }}>
      <CompactHeader model={model} logoSrc={logoSrc} tag="· Work process" />
      {page.first ? (
        <View style={{ gap: pt(6), paddingTop: pt(4) }}>
          <Text
            style={[
              s.cond,
              {
                fontSize: pt(TYPE.processTitle),
                lineHeight: 1,
                color: C.red700,
                letterSpacing: pt(TYPE.processTitle) * 0.02,
              },
            ]}
          >
            WORK PROCESS
          </Text>
          {note ? <Text style={[body, { fontSize: pt(TYPE.jobDescription) }]}>{note}</Text> : null}
        </View>
      ) : null}
      <View style={{ borderTopWidth: pt(2), borderTopColor: C.ink }}>
        {page.steps.map((step) => (
          <View
            key={step.key}
            style={[
              s.row,
              {
                gap: pt(STEP.colGap),
                paddingVertical: pt(STEP.padY),
                borderBottomWidth: pt(1),
                borderBottomColor: C.lineSoft,
              },
            ]}
            wrap={false}
          >
            <Text
              style={[
                s.cond,
                {
                  width: pt(STEP.numberCol),
                  fontSize: pt(TYPE.stepNumber),
                  lineHeight: 1,
                  color: C.red700,
                },
              ]}
            >
              {step.nn}
            </Text>
            <View style={{ flexGrow: 1, flexBasis: 0, gap: pt(3) }}>
              {step.title ? (
                <Text style={{ fontSize: pt(TYPE.stepTitle), fontWeight: 700, lineHeight: 1.25 }}>
                  {step.title}
                </Text>
              ) : null}
              {step.body ? <Text style={[body, { color: C.walnut700 }]}>{step.body}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PdfPageView({
  model,
  page,
  logoSrc,
  processPage,
}: {
  model: PdfModel;
  page: PdfPage;
  logoSrc: string;
  processPage: number | null;
}) {
  const gap = model.extras.length ? PAGE.gapWithExtras : PAGE.gap;
  return (
    <Page size="LETTER" style={s.page}>
      {page.kind === 'document' ? (
        <DocumentPageView
          model={model}
          page={page}
          logoSrc={logoSrc}
          processPage={processPage}
          gap={gap}
        />
      ) : (
        <ProcessPageView model={model} page={page} logoSrc={logoSrc} gap={gap} />
      )}
      <View style={s.footer} fixed>
        <Text>{model.footer.left}</Text>
        <Text>{model.footer.center}</Text>
        <Text style={{ color: C.ink, fontWeight: 700 }}>
          Page {page.pageNo} of {page.pageCount}
        </Text>
      </View>
    </Page>
  );
}

export function DocumentPdf({ model, logoSrc }: { model: PdfModel; logoSrc: string }) {
  const pages = paginate(model);
  const processPage = processStartPage(pages);
  return (
    <Document
      title={`${model.title === 'INVOICE' ? 'Invoice' : 'Work Estimate'} ${model.number}`}
      author={COMPANY.name}
      creator={COMPANY.name}
      producer={COMPANY.name}
      language="en-US"
    >
      {pages.map((page) => (
        <PdfPageView
          key={page.pageNo}
          model={model}
          page={page}
          logoSrc={logoSrc}
          processPage={processPage}
        />
      ))}
    </Document>
  );
}
