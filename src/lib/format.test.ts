import { describe, expect, it } from 'vitest';
import { formatSavedAt } from './format';

const at = (d: number, h: number, m: number) => new Date(2026, 9, d, h, m).getTime();

describe('formatSavedAt', () => {
  it('says hoy / ayer / date', () => {
    const now = at(5, 10, 0);
    expect(formatSavedAt(at(5, 9, 5), now)).toMatch(/^hoy, 9:05/);
    expect(formatSavedAt(at(4, 18, 15), now)).toMatch(/^ayer, 6:15/);
    expect(formatSavedAt(at(2, 18, 15), now)).toMatch(/^2 oct, 6:15/);
  });
});
