import { describe, expect, it } from 'vitest';
import type { Expense, Participant } from './api';
import { buildExpensesCsv } from './csv';

const participants: Participant[] = [
  { id: 'p1', name: 'Ana', groupId: 'g1', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'p2', name: 'Bruno "The Rock"', groupId: 'g1', createdAt: '2026-01-01T00:00:00.000Z' },
];

describe('buildExpensesCsv', () => {
  it('writes a header row followed by one row per expense', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Dinner',
        amountCents: 5000,
        paidById: 'p1',
        createdAt: '2026-03-04T12:00:00.000Z',
        shares: [
          { id: 's1', participantId: 'p1', shareCents: 2500 },
          { id: 's2', participantId: 'p2', shareCents: 2500 },
        ],
      },
    ];

    const csv = buildExpensesCsv(expenses, participants);
    const [header, row] = csv.split('\r\n');

    expect(header).toBe('"Date","Description","Amount","Paid by","Split among"');
    expect(row).toBe('"2026-03-04","Dinner","50.00","Ana","Ana; Bruno ""The Rock"""');
  });

  it('escapes quotes in names and descriptions', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Pizza "extra cheese"',
        amountCents: 1000,
        paidById: 'p2',
        createdAt: '2026-03-04T12:00:00.000Z',
        shares: [{ id: 's1', participantId: 'p2', shareCents: 1000 }],
      },
    ];

    const csv = buildExpensesCsv(expenses, participants);
    expect(csv).toContain('"Pizza ""extra cheese"""');
    expect(csv).toContain('"Bruno ""The Rock"""');
  });

  it('produces just the header row when there are no expenses', () => {
    expect(buildExpensesCsv([], participants)).toBe('"Date","Description","Amount","Paid by","Split among"');
  });
});
