import type { DocumentData, LineItem } from '../domain/types';
import { DEFAULT_TERMS } from '../domain/terms';

let n = 0;
const sqft = (
  description: string,
  qty: number,
  priceCents: number,
  unit: LineItem['unit'] = 'sq ft',
): LineItem => ({
  id: `i${String(++n)}`,
  description,
  unit,
  otherUnit: '',
  qtyHundredths: Math.round(qty * 100),
  unitPriceCents: priceCents,
  lumpSumCents: 0,
});
const lump = (description: string, cents: number): LineItem => ({
  id: `i${String(++n)}`,
  description,
  unit: 'lump sum',
  otherUnit: '',
  qtyHundredths: 0,
  unitPriceCents: 0,
  lumpSumCents: cents,
});

/** The real sample estimate from SPEC §6, with the invented customer from the design. */
export const SAMPLE_ESTIMATE: DocumentData = {
  type: 'estimate',
  number: 'EST-20261005-01',
  date: '2026-10-05',
  estimateRef: '',
  customer: {
    name: 'Margaret Kelly',
    address: '412 Owen Ave, Lansdowne, PA 19050',
    phone: '(610) 555-0142',
    email: 'mkelly.home@gmail.com',
  },
  jobDescription:
    'Demolition of existing flooring area, removal of existing carpet, installation of new hardwood floors and refinishing.',
  items: [
    sqft('Remove carpet and hardwood floor', 1625, 85),
    sqft('Install and refinish', 1625, 750),
    sqft('Refinish scraper hardwood floors', 447, 400),
    lump('Refinish steps and handrails — 15 steps, 10 sticks', 300000),
  ],
  deposit: { mode: 'percent', percentHundredths: 3000 },
  terms: DEFAULT_TERMS.estimate,
};

export const SAMPLE_INVOICE: DocumentData = {
  ...SAMPLE_ESTIMATE,
  type: 'invoice',
  number: 'INV-20261005-01',
  estimateRef: 'EST-20261005-01',
  terms: DEFAULT_TERMS.invoice,
};

/** The long estimate from the design's two-page example (18 rows). */
export const LONG_ESTIMATE: DocumentData = {
  ...SAMPLE_ESTIMATE,
  number: 'EST-20261005-02',
  jobDescription:
    'Whole-house flooring: demolition of existing flooring, subfloor repair, installation of new hardwood floors on first floor and closets, staircase refinishing, trim and final finish.',
  items: [
    lump('Floor protection and dust containment', 45000),
    sqft('Remove carpet and hardwood floor', 1625, 85),
    sqft('Subfloor repair and leveling', 220, 325),
    sqft('Moisture barrier underlayment', 1625, 45),
    sqft('Install and refinish', 1625, 750),
    sqft('Refinish scraper hardwood floors', 447, 400),
    sqft('Stain application — Provincial, 1 coat', 2072, 75),
    lump('Refinish steps and handrails — 15 steps, 10 sticks', 300000),
    sqft('Stair nosing replacement', 15, 2800, 'each'),
    sqft('Quarter round install', 380, 225, 'linear ft'),
    sqft('Baseboard removal and reinstall', 380, 150, 'linear ft'),
    sqft('Transition strips', 6, 4500, 'each'),
    sqft('Floor register cutouts', 9, 1800, 'each'),
    sqft('Furniture moving', 6, 6500, 'hours'),
    sqft('Closet floor install', 64, 750),
    sqft('Water-based polyurethane topcoat — 3 coats', 2072, 120),
    lump('Debris haul-away and dumpster', 65000),
    lump('Final cleaning', 20000),
  ],
};
