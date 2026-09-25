import { describe, expect, it } from 'vitest';
import { buildPixPayload, crc16 } from './pix';

describe('buildPixPayload', () => {
  it("matches the Banco Central manual's example byte for byte", () => {
    expect(
      buildPixPayload({ key: '123e4567-e12b-12d1-a456-426655440000', name: 'Fulano de Tal', city: 'BRASILIA' }),
    ).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
    );
  });

  it('fills in the amount and keeps names bank-safe', () => {
    const payload = buildPixPayload({ key: 'ana@example.com', name: 'Ana Júlia Conceição da Silva Sauro', amountCents: 9500 });
    expect(payload).toContain('540595.00');
    expect(payload).toContain('5925Ana Julia Conceicao da Si');
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });
});
