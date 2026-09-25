import type { Expense, Participant } from './api';

export function buildExpensesCsv(expenses: Expense[], participants: Participant[]): string {
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const header = ['Date', 'Description', 'Category', 'Amount', 'Paid by', 'Split among', 'Note'];

  const rows = expenses.map((expense) => [
    new Date(expense.createdAt).toISOString().slice(0, 10),
    expense.description,
    expense.category,
    (expense.amountCents / 100).toFixed(2),
    nameById.get(expense.paidById) ?? '',
    expense.shares.map((share) => nameById.get(share.participantId) ?? '').join('; '),
    expense.note ?? '',
  ]);

  // Descriptions, notes and names are typed by anyone in the group. A cell
  // starting with = + - @ is run as a formula by Excel and Sheets
  // (=HYPERLINK(...) and friends), so it gets a leading apostrophe.
  const neutralize = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
  const escape = (value: string) => `"${neutralize(value).replaceAll('"', '""')}"`;
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
