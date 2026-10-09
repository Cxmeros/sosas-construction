import { COMPANY } from '../config/company';
import type { DocType } from './types';

/** Default terms printed on the PDF (English), editable per document (SPEC §7). */
export const DEFAULT_TERMS: Record<DocType, string> = {
  estimate:
    'This is an estimate, not a quote or contract. It covers the work described above based on the information provided and may be modified due to additional information or unforeseen conditions.',
  invoice: `Payment is due upon receipt of this invoice. Please make checks payable to ${COMPANY.payee} and reference the invoice number. We appreciate the opportunity to work in your home.`,
};
