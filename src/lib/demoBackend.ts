import { ApiError, type Balance, type Expense, type ExpenseInput, type Participant, type RecurringExpense, type Transfer } from './api';

type Group = {
  code: string; name: string; pin: string; currency: string; createdAt: string; active: boolean;
  participants: Participant[]; expenses: Expense[]; recurring: RecurringExpense[];
  payments: { fromId: string; toId: string; amountCents: number }[];
};
const KEY = 'rachai-demo-groups-v1';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
function read(): Group[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Group[]; } catch { return []; }
}
function save(groups: Group[]) { localStorage.setItem(KEY, JSON.stringify(groups)); }
function fail(message: string, status: number): never { throw new ApiError(message, status); }
function balances(group: Group): { balances: Balance[]; suggestedTransfers: Transfer[] } {
  const sums = new Map(group.participants.map(p => [p.id, 0]));
  for (const expense of group.expenses) {
    sums.set(expense.paidById, (sums.get(expense.paidById) || 0) + expense.amountCents);
    for (const share of expense.shares) sums.set(share.participantId, (sums.get(share.participantId) || 0) - share.shareCents);
  }
  for (const payment of group.payments || []) {
    sums.set(payment.fromId, (sums.get(payment.fromId) || 0) + payment.amountCents);
    sums.set(payment.toId, (sums.get(payment.toId) || 0) - payment.amountCents);
  }
  const debtors = group.participants.map(p => ({ ...p, amount: -(sums.get(p.id) || 0) })).filter(p => p.amount > 0);
  const creditors = group.participants.map(p => ({ ...p, amount: sums.get(p.id) || 0 })).filter(p => p.amount > 0);
  const suggestedTransfers: Transfer[] = [];
  for (const debtor of debtors) for (const creditor of creditors) {
    const amountCents = Math.min(debtor.amount, creditor.amount);
    if (amountCents <= 0) continue;
    suggestedTransfers.push({ fromId: debtor.id, toId: creditor.id, fromName: debtor.name, toName: creditor.name, amountCents });
    debtor.amount -= amountCents; creditor.amount -= amountCents;
  }
  return {
    balances: group.participants.map(p => ({ participantId: p.id, name: p.name, amountCents: sums.get(p.id) || 0 })),
    suggestedTransfers,
  };
}
function expenseFrom(group: Group, data: ExpenseInput, previous?: Expense): Expense {
  const ids = data.shares?.map(s => s.participantId) ?? data.participantIds ?? group.participants.map(p => p.id);
  const amount = data.amountCents;
  const base = Math.floor(amount / ids.length);
  const shares = data.shares ?? ids.map((participantId, i) => ({ participantId, shareCents: base + (i < amount - base * ids.length ? 1 : 0) }));
  return {
    id: previous?.id ?? uid(), description: data.description, amountCents: amount, paidById: data.paidById,
    category: data.category ?? 'other', note: data.note ?? null, recurringId: previous?.recurringId ?? null,
    createdAt: previous?.createdAt ?? now(),
    shares: shares.map(s => ({ id: uid(), ...s })),
  };
}
export async function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(String(options.body)) as Record<string, any> : {};
  const groups = read();
  const parts = path.split('/').filter(Boolean);
  let result: unknown;
  if (parts[0] === 'groups' && parts.length === 1 && method === 'POST') {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const group: Group = { code, name: String(body.name), pin: String(body.pin), currency: String(body.currency), createdAt: now(), active: true, participants: [], expenses: [], recurring: [], payments: [] };
    groups.push(group); save(groups);
    result = { code, name: group.name, currency: group.currency };
  } else if (parts[0] === 'groups') {
    const group = groups.find(g => g.code === parts[1] && g.active);
    if (!group) fail('Grupo não encontrado', 404);
    const section = parts[2];
    if (section === 'join' && method === 'POST') {
      if (body.pin !== group.pin) fail('PIN incorreto', 401);
      result = { token: 'demo-editor', name: group.name, currency: group.currency, role: 'editor' };
    } else if (section === 'view' && method === 'POST') {
      result = { token: 'demo-viewer', name: group.name, currency: group.currency, role: 'viewer' };
    } else if (!section) result = { code: group.code, name: group.name, currency: group.currency, createdAt: group.createdAt };
    else if (section === 'participants') {
      if (method === 'GET') result = group.participants;
      else if (method === 'POST') {
        result = { id: uid(), name: String(body.name), groupId: group.code, pixKey: null, createdAt: now() } as Participant;
        group.participants.push(result as Participant); save(groups);
      } else if (method === 'PATCH') {
        const p = group.participants.find(p => p.id === parts[3]);
        if (!p) fail('Participante não encontrado', 404);
        p.pixKey = body.pixKey ? String(body.pixKey) : null; save(groups); result = p;
      }
    } else if (section === 'recurring') {
      if (method === 'GET') result = group.recurring;
      else if (method === 'POST') {
        result = { id: uid(), ...body } as RecurringExpense;
        group.recurring.push(result as RecurringExpense); save(groups);
      } else if (method === 'DELETE') {
        group.recurring = group.recurring.filter(r => r.id !== parts[3]); save(groups);
      }
    } else if (section === 'expenses') {
      if (method === 'GET') result = group.expenses;
      else if (method === 'POST') {
        result = expenseFrom(group, body as ExpenseInput);
        group.expenses.push(result as Expense); save(groups);
      } else {
        const index = group.expenses.findIndex(e => e.id === parts[3]);
        if (index < 0) fail('Despesa não encontrada', 404);
        if (method === 'PATCH') { result = expenseFrom(group, body as ExpenseInput, group.expenses[index]); group.expenses[index] = result as Expense; }
        if (method === 'DELETE') group.expenses.splice(index, 1);
        save(groups);
      }
    } else if (section === 'balances') result = balances(group);
    else if (section === 'payments' && method === 'POST') {
      group.payments ||= [];
      group.payments.push({ fromId: String(body.fromId), toId: String(body.toId), amountCents: Number(body.amountCents) });
      save(groups);
    }
  } else if (parts[0] === 'admin') {
    if (path === '/admin/auth/login') result = { requiresTotp: false, token: 'demo-admin' };
    else if (path === '/admin/auth/totp/verify') result = { ok: true, token: 'demo-admin' };
    else if (path === '/admin/auth/logout') result = { ok: true };
    else if (path === '/admin/dashboard/stats') {
      result = {
        totalGroups: groups.length, activeGroups: groups.filter(g => g.active).length,
        totalExpenses: groups.reduce((n, g) => n + g.expenses.length, 0),
        totalVolumeByCurrency: [...new Set(groups.map(g => g.currency))].map(currency => ({ currency, amountCents: groups.filter(g => g.currency === currency).flatMap(g => g.expenses).reduce((n, e) => n + e.amountCents, 0) })),
        groupsByDay: [...new Set(groups.map(g => g.createdAt.slice(0, 10)))].map(day => ({ day, count: groups.filter(g => g.createdAt.startsWith(day)).length })),
      };
    } else if (path === '/admin/dashboard/groups') result = groups.map(g => ({ id: g.code, name: g.name, code: g.code, currency: g.currency, active: g.active, createdAt: g.createdAt, _count: { participants: g.participants.length, expenses: g.expenses.length } }));
    else if (parts[1] === 'groups' && parts[3] === 'deactivate') {
      const g = groups.find(g => g.code === parts[2]);
      if (!g) fail('Grupo não encontrado', 404);
      g.active = false; save(groups); result = { code: g.code, active: false };
    }
  }
  if (result === undefined && method !== 'DELETE' && sectionNotVoid(path)) fail('Rota não encontrada', 404);
  return result as T;
}
function sectionNotVoid(path: string) { return !path.endsWith('/payments'); }
