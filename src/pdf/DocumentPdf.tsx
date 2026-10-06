import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  type Styles,
} from '@react-pdf/renderer';
import { COLORS as C, COMPANY } from '../config/company';
import { formatCents } from '../domain/money';
import { COLS, PAGE, TYPE, paginate, type PdfPage } from './layout';
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

const lh = TYPE.lineHeight;

const s = StyleSheet.create({
  page: {
    paddingTop: pt(PAGE.padTop),
    paddingHorizontal: pt(PAGE.padX),
    fontFamily: 'Barlow',
    fontSize: pt(TYPE.body),
    lineHeight: lh,
    color: C.ink,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    gap: pt(PAGE.gap),
  },
  cond: { fontFamily: 'Barlow Condensed', fontWeight: 700 },
  sectionLabel: {
    fontFamily: 'Barlow Condensed',
    fontWeight: 700,
    fontSize: pt(TYPE.label),
    letterSpacing: pt(TYPE.label) * 0.1,
    color: C.orange700,
  },
  rule: { borderBottomWidth: 1 * 0.75, borderBottomColor: C.line, paddingBottom: pt(4) },
  row: { flexDirection: 'row' },
  cell: { paddingVertical: pt(7), paddingHorizontal: pt(6) },
  descCell: { flexGrow: 1, flexBasis: 0, paddingVertical: pt(7), paddingRight: pt(8) },
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

const col = (width: number, align: 'left' | 'right', last = false): Style => ({
  width: pt(width),
  paddingVertical: pt(7),
  paddingLeft: pt(6),
  paddingRight: last ? 0 : pt(6),
  textAlign: align,
});

/** "+" registration marks outside the corners of a box. */
function Corners() {
  const arm = pt(11);
  const off = -pt(6);
  const mark = (pos: Style) => (
    <View style={{ position: 'absolute', width: arm, height: arm, ...pos }}>
      <View
        style={{
          position: 'absolute',
          left: pt(5),
          top: 0,
          width: pt(1),
          height: arm,
          backgroundColor: C.corner,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: pt(5),
          left: 0,
          height: pt(1),
          width: arm,
          backgroundColor: C.corner,
        }}
      />
    </View>
  );
  return (
    <>
      {mark({ top: off, left: off })}
      {mark({ top: off, right: off })}
      {mark({ bottom: off, left: off })}
      {mark({ bottom: off, right: off })}
    </>
  );
}

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
        borderBottomColor: C.orange500,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: pt(14) }}>
        <Image src={logoSrc} style={{ height: pt(92), width: pt((92 * 525) / 245) }} />
        <View
          style={{
            borderLeftWidth: pt(1),
            borderLeftColor: C.lineSoft,
            paddingLeft: pt(14),
            fontSize: pt(TYPE.company),
            color: C.inkMuted,
          }}
        >
          <Text style={{ color: C.ink, fontSize: pt(13), fontWeight: 700 }}>{COMPANY.owner}</Text>
          <Text>{COMPANY.addressLine1}</Text>
          <Text>{COMPANY.addressLine2}</Text>
          {COMPANY.phones.map((p) => (
            <Text key={p}>{p}</Text>
          ))}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: pt(8) }}>
        <Text
          style={[
            s.cond,
            {
              fontSize: pt(TYPE.title),
              lineHeight: 0.95,
              color: C.orange700,
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
              <Text style={{ fontWeight: 600, minWidth: pt(96), textAlign: 'right' }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CompactHeader({ model, logoSrc }: { model: PdfModel; logoSrc: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: pt(10),
        borderBottomWidth: pt(3),
        borderBottomColor: C.orange500,
      }}
    >
      <Image src={logoSrc} style={{ height: pt(48), width: pt((48 * 525) / 245) }} />
      <View style={{ alignItems: 'flex-end', gap: pt(2) }}>
        <Text
          style={[
            s.cond,
            {
              fontSize: pt(TYPE.compactTitle),
              lineHeight: 1,
              color: C.orange700,
              letterSpacing: pt(TYPE.compactTitle) * 0.02,
            },
          ]}
        >
          {model.title} <Text style={{ color: C.inkMuted, fontWeight: 600 }}>(continued)</Text>
        </Text>
        <Text style={{ fontSize: pt(TYPE.meta), fontWeight: 600 }}>
          No. {model.number} · {model.date} · {model.customer.name}
        </Text>
      </View>
    </View>
  );
}

function Row({ row }: { row: PdfRow }) {
  return (
    <View style={[s.row, { borderBottomWidth: pt(1), borderBottomColor: C.lineSoft }]} wrap={false}>
      <View style={s.descCell}>
        <Text style={{ fontWeight: 500 }}>{row.description}</Text>
        {row.note ? (
          <Text style={{ fontSize: pt(TYPE.note), color: C.inkMuted }}>{row.note}</Text>
        ) : null}
      </View>
      <Text style={col(COLS.qty, 'right')}>{row.qty}</Text>
      <Text style={col(COLS.unit, 'left')}>{row.unit}</Text>
      <Text style={col(COLS.unitPrice, 'right')}>{row.unitPrice}</Text>
      <Text style={[col(COLS.amount, 'right', true), { fontWeight: 600 }]}>{row.amount}</Text>
    </View>
  );
}

function Section({ label, text, style }: { label: string; text: string; style: Style }) {
  return (
    <View style={{ gap: pt(6) }} wrap={false}>
      <Text style={[s.sectionLabel, s.rule]}>{label}</Text>
      <Text style={style}>{text}</Text>
    </View>
  );
}

function PdfPageView({
  model,
  page,
  logoSrc,
}: {
  model: PdfModel;
  page: PdfPage;
  logoSrc: string;
}) {
  return (
    <Page size="LETTER" style={s.page}>
      {page.fullHeader ? (
        <>
          <FullHeader model={model} logoSrc={logoSrc} />
          <View
            style={{
              position: 'relative',
              borderWidth: pt(1.5),
              borderColor: C.ink,
              paddingVertical: pt(12),
              paddingHorizontal: pt(14),
              gap: pt(6),
            }}
          >
            <Corners />
            <Text style={s.sectionLabel}>CUSTOMER INFORMATION</Text>
            <Text style={{ fontSize: pt(TYPE.customerName), fontWeight: 700 }}>
              {model.customer.name}
            </Text>
            {model.customer.address ? <Text>{model.customer.address}</Text> : null}
            {model.customer.contact ? <Text>{model.customer.contact}</Text> : null}
          </View>
          {model.jobDescription ? (
            <Section
              label="JOB DESCRIPTION"
              text={model.jobDescription}
              style={{ fontSize: pt(TYPE.jobDescription) }}
            />
          ) : null}
        </>
      ) : (
        <CompactHeader model={model} logoSrc={logoSrc} />
      )}

      {page.showTable ? (
        <View>
          <Text style={[s.sectionLabel, { paddingBottom: pt(6) }]}>SERVICES AND MATERIALS</Text>
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
            <Text style={s.descCell}>DESCRIPTION</Text>
            <Text style={col(COLS.qty, 'right')}>QTY</Text>
            <Text style={col(COLS.unit, 'left')}>UNIT</Text>
            <Text style={col(COLS.unitPrice, 'right')}>UNIT PRICE</Text>
            <Text style={col(COLS.amount, 'right', true)}>AMOUNT</Text>
          </View>
          {page.rows.map((row) => (
            <Row key={row.key} row={row} />
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
              <Text style={{ color: C.ink, fontWeight: 700 }}>
                Continued on page {page.continued.nextPage} ›
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {page.showTotals ? (
        <>
          <View
            style={{
              position: 'relative',
              alignSelf: 'flex-end',
              width: pt(340),
              borderWidth: pt(1.5),
              borderColor: C.ink,
            }}
            wrap={false}
          >
            <Corners />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: pt(9),
                paddingHorizontal: pt(14),
                fontSize: pt(TYPE.totalsTotal),
                fontWeight: 700,
              }}
            >
              <Text>Total</Text>
              <Text>{model.total}</Text>
            </View>
            {model.deposit ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: pt(9),
                  paddingHorizontal: pt(14),
                  borderTopWidth: pt(1),
                  borderTopColor: C.line,
                  fontSize: pt(TYPE.totalsRow),
                }}
              >
                <Text>{model.deposit.label}</Text>
                <Text style={{ fontWeight: 600 }}>{model.deposit.value}</Text>
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingVertical: pt(11),
                paddingHorizontal: pt(14),
                borderTopWidth: pt(2),
                borderTopColor: C.ink,
                backgroundColor: C.orange100,
              }}
            >
              <Text style={{ fontWeight: 700, fontSize: pt(TYPE.totalsRow), paddingBottom: pt(2) }}>
                {model.balanceLabel}
              </Text>
              <Text style={[s.cond, { fontSize: pt(TYPE.balance), lineHeight: 1 }]}>
                {model.balance}
              </Text>
            </View>
          </View>
          {model.terms ? (
            <Section
              label="TERMS AND CONDITIONS"
              text={model.terms}
              style={{ fontSize: pt(TYPE.terms), color: C.walnut700 }}
            />
          ) : null}
        </>
      ) : null}

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
  return (
    <Document
      title={`${model.title === 'INVOICE' ? 'Invoice' : 'Work Estimate'} ${model.number}`}
      author={COMPANY.name}
      creator={COMPANY.name}
      producer={COMPANY.name}
      language="en-US"
    >
      {pages.map((page) => (
        <PdfPageView key={page.pageNo} model={model} page={page} logoSrc={logoSrc} />
      ))}
    </Document>
  );
}
