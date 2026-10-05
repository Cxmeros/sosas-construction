/**
 * Rough text metrics for Barlow, used to decide page breaks before rendering. The same breaks are
 * used by the HTML preview and the real PDF, so both always show the same pages. The estimates
 * are deliberately a little wide (safety factor) so a row never overflows its page.
 */
const SAFETY = 1.06;

function charEm(ch: string): number {
  if (ch === ' ') return 0.22;
  if (/[il.,:;'!|]/.test(ch)) return 0.24;
  if (/[fjrt()[\]-]/.test(ch)) return 0.33;
  if (/[mw]/.test(ch)) return 0.78;
  if (/[MW]/.test(ch)) return 0.86;
  if (/[a-z]/.test(ch)) return 0.5;
  if (/[A-Z]/.test(ch)) return 0.6;
  if (/[0-9]/.test(ch)) return 0.55;
  return 0.6;
}

export function textWidth(text: string, fontSizePx: number, bold = false): number {
  let em = 0;
  for (const ch of text) em += charEm(ch);
  return em * fontSizePx * SAFETY * (bold ? 1.04 : 1);
}

/** Number of lines `text` takes when wrapped to `widthPx`. Explicit newlines are honored. */
export function countLines(
  text: string,
  widthPx: number,
  fontSizePx: number,
  bold = false,
): number {
  if (!text) return 0;
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    let current = 0;
    let paragraphLines = 1;
    const space = textWidth(' ', fontSizePx, bold);
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const w = textWidth(word, fontSizePx, bold);
      if (w > widthPx) {
        // A single word longer than the line breaks across lines.
        if (current > 0) paragraphLines += 1;
        const extra = Math.ceil(w / widthPx) - 1;
        paragraphLines += extra;
        current = w - extra * widthPx;
        continue;
      }
      if (current === 0) current = w;
      else if (current + space + w <= widthPx) current += space + w;
      else {
        paragraphLines += 1;
        current = w;
      }
    }
    lines += paragraphLines;
  }
  return lines;
}
