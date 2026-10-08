import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLORS } from './company';

const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf8');

/** WCAG 2.x contrast ratio. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('brand colors', () => {
  it('match the Tailwind theme in styles.css', () => {
    const vars = [...css.matchAll(/--color-brand-(\d{3}):\s*(#[0-9a-f]{6})/gi)];
    expect(vars.length).toBeGreaterThan(0);
    for (const [, shade, value] of vars) {
      const key = `brand${shade ?? ''}` as keyof typeof COLORS;
      expect(COLORS[key], key).toBe(value?.toUpperCase());
    }
  });

  // Each pair is how the shade is used in the app or the PDF.
  it.each([
    ['PDF bars and app buttons: white text', COLORS.brand600, COLORS.surface, 4.5],
    ['primary button: white text', COLORS.brand700, COLORS.surface, 4.5],
    ['button hover: white text', COLORS.brand800, COLORS.surface, 4.5],
    ['amounts on paper', COLORS.brand800, COLORS.paper, 4.5],
    ['PDF box text', COLORS.brand800, COLORS.brand100, 4.5],
    ['focus ring on paper', COLORS.brand700, COLORS.paper, 3],
    ['bright buttons on dark bars: dark text', COLORS.brand400, COLORS.ink, 4.5],
    ['button hover on dark bars: dark text', COLORS.brand300, COLORS.ink, 4.5],
    ['focus ring and text on dark bars', COLORS.brand400, COLORS.walnut900, 4.5],
    ['totals on dark bars', COLORS.brand300, COLORS.walnut900, 4.5],
  ])('%s (AA)', (_, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
