import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOGO, logoWidth } from './logo';

describe('LOGO', () => {
  it('has the pixel size of the logo file', () => {
    const png = readFileSync(resolve(__dirname, '../assets/logo-placeholder.png'));
    // PNG IHDR: width and height are big-endian at bytes 16 and 20.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([LOGO.width, LOGO.height]);
  });

  it('keeps the proportions', () => {
    expect(logoWidth(LOGO.height)).toBe(LOGO.width);
  });
});
