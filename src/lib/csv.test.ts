import { describe, expect, it } from 'vitest';
import type { Expense, Participant } from './api';
import { buildExpensesCsv } from './csv';

const participants: Participant[] = [
  { id: 'p1', name: 'Ana', groupId: 'g1', pixKey: null, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'p2', name: 'Bruno "The Rock"', groupId: 'g1', pixKey: null, createdAt: '2026-01-01T00:00:00.000Z' },
];

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e1',
    description: 'Dinner',
    amountCents: 5000,
    paidById: 'p1',
    category: 'food',
    note: null,
    recurringId: null,
    createdAt: '2026-03-04T12:00:00.000Z',
    shares: [
      { id: 's1', participantId: 'p1', shareCents: 2500 },
      { id: 's2', participantId: 'p2', shareCents: 2500 },
    ],
    ...overrides,
  };
}

const HEADER = '"Date","Description","Category","Amount","Paid by","Split among","Note"';

describe('buildExpensesCsv', () => {
  it('writes a header row followed by one row per expense', () => {
    const [header, row] = buildExpensesCsv([expense({ note: 'receipt 12' })], participants).split('\r\n');

    expect(header).toBe(HEADER);
    expect(row).toBe('"2026-03-04","Dinner","food","50.00","Ana","Ana; Bruno ""The Rock""","receipt 12"');
  });

  it('escapes quotes in names and descriptions', () => {
    const csv = buildExpensesCsv(
      [expense({ description: 'Pizza "extra cheese"', paidById: 'p2', shares: [{ id: 's1', participantId: 'p2', shareCents: 1000 }] })],
      participants,
    );
    expect(csv).toContain('"Pizza ""extra cheese"""');
    expect(csv).toContain('"Bruno ""The Rock"""');
  });

  it('keeps spreadsheet apps from running a cell as a formula', () => {
    const csv = buildExpensesCsv(
      [expense({ description: '=HYPERLINK("http://evil.example","Refund")', note: '+cmd|calc' })],
      participants,
    );
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""Refund"")"`);
    expect(csv).toContain(`"'+cmd|calc"`);
  });

  it('produces just the header row when there are no expenses', () => {
    expect(buildExpensesCsv([], participants)).toBe(HEADER);
  });
});
