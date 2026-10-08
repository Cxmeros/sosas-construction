import { describe, expect, it } from 'vitest';
import { formatPhoneUS, usPhoneDigits } from './phone';

describe('usPhoneDigits', () => {
  it.each([
    ['6105550142', '6105550142'],
    ['610-555-0142', '6105550142'],
    ['(610) 555 0142', '6105550142'],
    ['+1 610.555.0142', '6105550142'],
    ['1 610 555 0142', '6105550142'],
    ['610 555', null],
    ['2 610 555 0142', null],
    ['610 555 0142 99', null],
    ['', null],
  ])('%s', (raw, digits) => {
    expect(usPhoneDigits(raw)).toBe(digits);
  });
});

describe('formatPhoneUS', () => {
  it('prints (XXX) XXX-XXXX', () => {
    expect(formatPhoneUS('610.555.0142')).toBe('(610) 555-0142');
    expect(formatPhoneUS('+1 610 555 0142')).toBe('(610) 555-0142');
  });

  it('leaves anything else as typed', () => {
    expect(formatPhoneUS(' 555 0142 ')).toBe('555 0142');
    expect(formatPhoneUS('')).toBe('');
  });
});
