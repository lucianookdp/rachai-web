import { describe, expect, it } from 'vitest';
import { buildJoinUrl, buildWhatsAppUrl, sanitizeGroupCode } from './share';

describe('buildJoinUrl', () => {
  it('points at this deployment and carries the code', () => {
    const url = buildJoinUrl('ABC123');
    expect(url).toBe(`${window.location.origin}${import.meta.env.BASE_URL}?c=ABC123`);
  });

  it('never carries anything but the code', () => {
    const url = new URL(buildJoinUrl('ABC123'));
    expect([...url.searchParams.keys()]).toEqual(['c']);
  });
});

describe('buildWhatsAppUrl', () => {
  it('encodes the whole message into the text parameter', () => {
    const url = new URL(buildWhatsAppUrl('*Rachaí*\nCode: ABC123'));
    expect(url.origin).toBe('https://wa.me');
    expect(url.searchParams.get('text')).toBe('*Rachaí*\nCode: ABC123');
  });

  it('keeps a message with URL syntax from adding parameters of its own', () => {
    const url = new URL(buildWhatsAppUrl('hi&phone=5511999999999#x'));
    expect([...url.searchParams.keys()]).toEqual(['text']);
    expect(url.searchParams.get('text')).toBe('hi&phone=5511999999999#x');
  });
});

describe('sanitizeGroupCode', () => {
  it('uppercases a code typed in lowercase', () => {
    expect(sanitizeGroupCode('abc123')).toBe('ABC123');
  });

  it('strips characters that could alter the URL or the request', () => {
    expect(sanitizeGroupCode('AB&c=1')).toBe('ABC1');
    expect(sanitizeGroupCode('../ABC123')).toBe('ABC123');
    expect(sanitizeGroupCode('<script>')).toBe('SCRIPT');
  });

  it('caps the length so an absurd value never reaches the API', () => {
    expect(sanitizeGroupCode('A'.repeat(500))).toHaveLength(12);
  });

  it('returns an empty string for a missing or junk-only value', () => {
    expect(sanitizeGroupCode(null)).toBe('');
    expect(sanitizeGroupCode(undefined)).toBe('');
    expect(sanitizeGroupCode('')).toBe('');
    expect(sanitizeGroupCode('!!!')).toBe('');
  });
});
