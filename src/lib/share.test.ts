import { describe, expect, it } from 'vitest';
import { mailtoUrl, whatsappUrl } from './share';

describe('share links', () => {
  it('builds wa.me links for US numbers only', () => {
    expect(whatsappUrl('(610) 555-0142', 'Hi there')).toBe(
      'https://wa.me/16105550142?text=Hi%20there',
    );
    expect(whatsappUrl('+1 610 555 0142', 'x')).toBe('https://wa.me/16105550142?text=x');
    expect(whatsappUrl('555-0142', 'x')).toBeNull();
  });
  it('builds mailto links for valid emails only', () => {
    expect(mailtoUrl('a@b.co', 'S', 'B')).toBe('mailto:a%40b.co?subject=S&body=B');
    expect(mailtoUrl('nope', 'S', 'B')).toBeNull();
  });
});
