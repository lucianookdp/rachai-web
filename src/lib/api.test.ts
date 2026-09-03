import { describe, expect, it } from 'vitest';
import { formatCents } from './api';

describe('formatCents', () => {
  it('formats Portuguese amounts as Brazilian reais', () => {
    expect(formatCents(12345, 'pt')).toBe('R$ 123,45');
  });

  it('formats non-Portuguese amounts as US dollars', () => {
    expect(formatCents(12345, 'en')).toBe('$123.45');
  });

  it('formats a zero amount', () => {
    expect(formatCents(0, 'en')).toBe('$0.00');
  });

  it('formats a negative amount', () => {
    expect(formatCents(-500, 'en')).toBe('-$5.00');
  });
});
