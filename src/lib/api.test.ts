import { describe, expect, it } from 'vitest';
import { formatCents } from './api';

// Intl.NumberFormat separates the currency symbol with a non-breaking
// space (U+00A0) for pt-BR, so normalize it to a regular space before
// comparing against a plain string literal.
function normalizeSpaces(value: string): string {
  return value.replace(/ /g, ' ');
}

describe('formatCents', () => {
  it('formats an amount in reais with Portuguese number conventions', () => {
    expect(normalizeSpaces(formatCents(12345, 'BRL', 'pt'))).toBe('R$ 123,45');
  });

  it('formats an amount in a given currency regardless of locale', () => {
    expect(formatCents(12345, 'USD', 'en')).toBe('$123.45');
    expect(formatCents(12345, 'EUR', 'en')).toBe('€123.45');
  });

  it('formats a zero amount', () => {
    expect(formatCents(0, 'USD', 'en')).toBe('$0.00');
  });

  it('formats a negative amount', () => {
    expect(formatCents(-500, 'USD', 'en')).toBe('-$5.00');
  });
});
