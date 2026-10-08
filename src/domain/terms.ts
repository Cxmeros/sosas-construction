import type { DocType } from './types';

/**
 * Default work-process steps (SPEC §3.7b), one per line, until Danilo saves his own on the device.
 * Empty until the client sends the steps they use: the section only prints when it has steps.
 */
export const DEFAULT_STEPS = '';

/** Default terms printed on the PDF (English), editable per document (SPEC §7). */
export const DEFAULT_TERMS: Record<DocType, string> = {
  estimate:
    'This is an estimate, not a quote or contract. It covers the work described above based on the information provided and may be modified due to additional information or unforeseen conditions.',
  invoice: 'Payment is due upon receipt. Thank you for your business.',
};
