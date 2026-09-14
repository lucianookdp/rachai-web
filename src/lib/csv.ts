import type { Expense, Participant } from './api';

export function buildExpensesCsv(expenses: Expense[], participants: Participant[]): string {
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const header = ['Date', 'Description', 'Amount', 'Paid by', 'Split among'];

  const rows = expenses.map((expense) => [
    new Date(expense.createdAt).toISOString().slice(0, 10),
    expense.description,
    (expense.amountCents / 100).toFixed(2),
    nameById.get(expense.paidById) ?? '',
    expense.shares.map((share) => nameById.get(share.participantId) ?? '').join('; '),
  ]);

  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

// Triggers a real browser download of in-memory content; there's no server
// round-trip, so this is just an object URL clicked through a throwaway link.
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
