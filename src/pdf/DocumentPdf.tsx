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
import { COLORS as C, COMPANY, OWNERS_LINE } from '../config/company';
import { logoWidth } from '../config/logo';
import { formatCents } from '../domain/money';
import {
  BAR,
  BOX,
  CELL,
  COLS,
  COLUMNS,
  PAGE,
  STEP_NUMBER_WIDTH,
  TABLE_GAP,
  TYPE,
  WOOD_STRIP_HEIGHT,
  paginate,
  segmentTables,
  type PdfPage,
  type PdfSegment,
} from './layout';
import type { PdfModel, PdfOption, PdfRow } from './model';

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
  bar: {
    fontFamily: 'Barlow Condensed',
    fontWeight: 700,
    fontSize: pt(TYPE.label),
    letterSpacing: pt(TYPE.label) * 0.1,
    color: '#FFFFFF',
    backgroundColor: C.brand600,
    paddingVertical: pt(BAR.padY),
    paddingHorizontal: pt(BAR.padX),
  },
  box: {
    backgroundColor: C.brand100,
    paddingVertical: pt(BOX.padY),
    paddingHorizontal: pt(BOX.padX),
    gap: pt(BOX.gap),
  },
  row: { flexDirection: 'row' },
  descCell: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: pt(CELL.padY),
    paddingHorizontal: pt(CELL.padX),
  },
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

/** Fixed-width column with a light grid line on its left. */
const col = (width: number, align: 'left' | 'right'): Style => ({
  width: pt(width),
  paddingVertical: pt(CELL.padY),
  paddingHorizontal: pt(CELL.padX),
  borderLeftWidth: pt(1),
  borderLeftColor: C.brand200,
  textAlign: align,
});
const tableSides: Style = {
  borderLeftWidth: pt(1),
  borderRightWidth: pt(1),
  borderColor: C.brand200,
};

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
        borderBottomColor: C.brand500,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: pt(14) }}>
        <Image src={logoSrc} style={{ height: pt(92), width: pt(logoWidth(92)) }} />
        <View
          style={{
            borderLeftWidth: pt(1),
            borderLeftColor: C.lineSoft,
            paddingLeft: pt(14),
            fontSize: pt(TYPE.company),
            color: C.inkMuted,
          }}
        >
          <Text style={{ color: C.ink, fontSize: pt(13), fontWeight: 700 }}>{OWNERS_LINE}</Text>
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
              color: C.brand600,
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
        borderBottomColor: C.brand500,
      }}
    >
      <Image src={logoSrc} style={{ height: pt(48), width: pt(logoWidth(48)) }} />
      <View style={{ alignItems: 'flex-end', gap: pt(2) }}>
        <Text
          style={[
            s.cond,
            {
              fontSize: pt(TYPE.compactTitle),
              lineHeight: 1,
              color: C.brand600,
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

/** `simple` (invoice): Description | Amount only. */
function Row({ row, simple }: { row: PdfRow; simple: boolean }) {
  return (
    <View
      style={[s.row, tableSides, { borderBottomWidth: pt(1), borderBottomColor: C.brand200 }]}
      wrap={false}
    >
      <View style={s.descCell}>
        <Text style={{ fontWeight: 500 }}>{row.description}</Text>
        {row.note ? (
          <Text style={{ fontSize: pt(TYPE.note), color: C.inkMuted }}>{row.note}</Text>
        ) : null}
      </View>
      {simple ? null : (
        <>
          <Text style={col(COLS.qty, 'right')}>{row.qty}</Text>
          <Text style={col(COLS.unit, 'left')}>{row.unit}</Text>
          <Text style={col(COLS.unitPrice, 'right')}>{row.unitPrice}</Text>
        </>
      )}
      <Text style={[col(COLS.amount, 'right'), { fontWeight: 600 }]}>{row.amount}</Text>
    </View>
  );
}

function Section({ label, text, style }: { label: string; text: string; style: Style }) {
  return (
    <View wrap={false}>
      <Text style={s.bar}>{label}</Text>
      <View style={s.box}>
        <Text style={style}>{text}</Text>
      </View>
    </View>
  );
}

/** `label`: "DESCRIPTION", or "ADDITIONAL CHARGES" above an invoice's extra charges. */
function TableHead({ simple, label = 'DESCRIPTION' }: { simple: boolean; label?: string }) {
  return (
    <View
      style={[
        s.row,
        tableSides,
        {
          borderTopWidth: pt(1),
          borderBottomWidth: pt(1),
          backgroundColor: C.brand100,
          color: C.brand800,
          fontWeight: 700,
          fontSize: pt(TYPE.tableHead),
          letterSpacing: pt(TYPE.tableHead) * 0.08,
        },
      ]}
    >
      <Text style={s.descCell}>{label}</Text>
      {simple ? null : (
        <>
          <Text style={col(COLS.qty, 'right')}>QTY</Text>
          <Text style={col(COLS.unit, 'left')}>UNIT</Text>
          <Text style={col(COLS.unitPrice, 'right')}>UNIT PRICE</Text>
        </>
      )}
      <Text style={col(COLS.amount, 'right')}>AMOUNT</Text>
    </View>
  );
}

function Totals({ option, full = false }: { option: PdfOption; full?: boolean }) {
  return (
    <View
      style={{
        position: 'relative',
        alignSelf: full ? 'stretch' : 'flex-end',
        ...(full ? {} : { width: pt(340) }),
        borderWidth: pt(1.5),
        borderColor: C.brand200,
      }}
      wrap={false}
    >
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
        <Text>{option.shortLabel ? `${option.shortLabel} total` : 'Total'}</Text>
        <Text>{option.total}</Text>
      </View>
      {option.deposit ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: pt(9),
            paddingHorizontal: pt(14),
            borderTopWidth: pt(1),
            borderTopColor: C.brand200,
            fontSize: pt(TYPE.totalsRow),
          }}
        >
          <Text>{option.deposit.label}</Text>
          <Text style={{ fontWeight: 600 }}>{option.deposit.value}</Text>
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
          borderTopColor: C.brand600,
          backgroundColor: C.brand600,
          color: '#FFFFFF',
        }}
      >
        <Text style={{ fontWeight: 700, fontSize: pt(TYPE.totalsRow), paddingBottom: pt(2) }}>
          {option.balanceLabel}
        </Text>
        <Text style={[s.cond, { fontSize: pt(TYPE.balance), lineHeight: 1 }]}>
          {option.balance}
        </Text>
      </View>
    </View>
  );
}

/** Two-option layout: one option as a card, like a side-by-side comparison. */
function OptionCard({ option }: { option: PdfOption }) {
  const amountCol: Style = { ...col(COLUMNS.amount, 'right') };
  return (
    <View style={{ flexGrow: 1, flexBasis: 0 }}>
      <Text style={s.bar}>{option.shortLabel.toUpperCase()}</Text>
      {option.title || option.description ? (
        <View style={s.box}>
          {option.title ? (
            <Text style={{ fontSize: pt(TYPE.customerName), fontWeight: 700 }}>{option.title}</Text>
          ) : null}
          {option.description ? <Text>{option.description}</Text> : null}
        </View>
      ) : null}
      <View style={{ marginTop: pt(TABLE_GAP) }}>
        <View
          style={[
            s.row,
            tableSides,
            {
              borderTopWidth: pt(1),
              borderBottomWidth: pt(1),
              backgroundColor: C.brand100,
              color: C.brand800,
              fontWeight: 700,
              fontSize: pt(TYPE.tableHead),
              letterSpacing: pt(TYPE.tableHead) * 0.08,
            },
          ]}
        >
          <Text style={s.descCell}>DESCRIPTION</Text>
          <Text style={amountCol}>AMOUNT</Text>
        </View>
        {option.rows.map((row) => (
          <View
            key={row.key}
            style={[s.row, tableSides, { borderBottomWidth: pt(1), borderBottomColor: C.brand200 }]}
            wrap={false}
          >
            <View style={s.descCell}>
              <Text style={{ fontWeight: 500 }}>{row.description}</Text>
              {row.note ? (
                <Text style={{ fontSize: pt(TYPE.note), color: C.inkMuted }}>{row.note}</Text>
              ) : null}
              {row.detail ? (
                <Text style={{ fontSize: pt(TYPE.note), color: C.inkMuted }}>{row.detail}</Text>
              ) : null}
            </View>
            <Text style={[amountCol, { fontWeight: 600 }]}>{row.amount}</Text>
          </View>
        ))}
      </View>
      {/* Pushes both cards' totals to the same line. */}
      <View style={{ flexGrow: 1, minHeight: pt(PAGE.gap) }} />
      <Totals option={option} full />
    </View>
  );
}

/** One option's part of a page: its bar (and description), table rows, and/or totals. */
function OptionSegment({
  option,
  segment,
  simple,
}: {
  option: PdfOption;
  segment: PdfSegment;
  simple: boolean;
}) {
  const continued = segment.header === 'continued';
  const { items, extras, showItemsHead } = segmentTables(segment);
  return (
    <>
      <View>
        <Text style={s.bar}>
          {continued ? `${option.shortLabel || option.label} (continued)` : option.label}
        </Text>
        {!continued && option.description ? (
          <View style={s.box}>
            <Text>{option.description}</Text>
          </View>
        ) : null}
        {segment.showTable ? (
          <View style={{ marginTop: pt(TABLE_GAP) }}>
            {showItemsHead ? <TableHead simple={simple} /> : null}
            {items.map((row) => (
              <Row key={row.key} row={row} simple={simple} />
            ))}
            {extras.length > 0 ? <TableHead simple label="ADDITIONAL CHARGES" /> : null}
            {extras.map((row) => (
              <Row key={row.key} row={row} simple />
            ))}
          </View>
        ) : null}
      </View>
      {segment.showTotals ? <Totals option={option} /> : null}
    </>
  );
}

function PdfPageView({
  model,
  page,
  logoSrc,
  woodSrc,
}: {
  model: PdfModel;
  page: PdfPage;
  logoSrc: string;
  woodSrc: string | undefined;
}) {
  return (
    <Page size="LETTER" style={s.page}>
      {woodSrc ? (
        <Image
          src={woodSrc}
          fixed
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: pt(PAGE.width),
            height: pt(WOOD_STRIP_HEIGHT),
            objectFit: 'cover',
          }}
        />
      ) : null}
      {page.fullHeader ? (
        <>
          <FullHeader model={model} logoSrc={logoSrc} />
          <View wrap={false}>
            <Text style={s.bar}>CUSTOMER INFORMATION</Text>
            <View style={s.box}>
              <Text style={{ fontSize: pt(TYPE.customerName), fontWeight: 700 }}>
                {model.customer.name}
              </Text>
              {model.customer.address ? <Text>{model.customer.address}</Text> : null}
              {model.customer.contact ? <Text>{model.customer.contact}</Text> : null}
            </View>
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

      {page.columns ? (
        <View style={{ flexDirection: 'row', gap: pt(COLUMNS.gap), alignItems: 'stretch' }}>
          {model.options.map((option) => (
            <OptionCard key={option.key} option={option} />
          ))}
        </View>
      ) : null}
      {page.segments.map((segment) => {
        if (page.columns) return null;
        const option = model.options[segment.option];
        if (!option) return null;
        return (
          <OptionSegment
            key={`${option.key}-${segment.header}`}
            option={option}
            segment={segment}
            simple={model.simpleTable}
          />
        );
      })}

      {page.continued ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            fontSize: pt(TYPE.note),
            color: C.inkMuted,
          }}
        >
          <Text>
            {page.continued.subtotalCents !== null ? (
              <>
                Subtotal this page:{' '}
                <Text style={{ color: C.ink, fontWeight: 700 }}>
                  {formatCents(page.continued.subtotalCents)}
                </Text>
              </>
            ) : (
              ''
            )}
          </Text>
          <Text style={{ color: C.ink, fontWeight: 700 }}>
            Continued on page {page.continued.nextPage} ›
          </Text>
        </View>
      ) : null}

      {page.showSteps ? (
        <View wrap={false}>
          <Text style={s.bar}>WORK PROCESS</Text>
          <View style={s.box}>
            {model.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row' }}>
                <Text style={{ width: pt(STEP_NUMBER_WIDTH), fontWeight: 700 }}>{i + 1}.</Text>
                <Text style={{ flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {page.showTerms ? (
        <Section
          label="TERMS AND CONDITIONS"
          text={model.terms}
          style={{ fontSize: pt(TYPE.terms), color: C.walnut700 }}
        />
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

export function DocumentPdf({
  model,
  logoSrc,
  woodSrc,
}: {
  model: PdfModel;
  logoSrc: string;
  /** Wood strip image (`FEATURES.woodHeader`); none when undefined. */
  woodSrc?: string;
}) {
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
        <PdfPageView
          key={page.pageNo}
          model={model}
          page={page}
          logoSrc={logoSrc}
          woodSrc={woodSrc}
        />
      ))}
    </Document>
  );
}
