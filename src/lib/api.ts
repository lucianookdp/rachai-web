const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error ?? 'Request failed', response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export interface Participant {
  id: string;
  name: string;
  groupId: string;
  createdAt: string;
}

export interface ExpenseShare {
  id: string;
  participantId: string;
  shareCents: number;
}

export interface Expense {
  id: string;
  description: string;
  amountCents: number;
  paidById: string;
  createdAt: string;
  shares: ExpenseShare[];
}

export interface Balance {
  participantId: string;
  name: string;
  amountCents: number;
}

export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
  fromName: string;
  toName: string;
}

export const api = {
  createGroup: (name: string, pin: string) =>
    request<{ code: string; name: string }>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, pin }),
    }),

  joinGroup: (code: string, pin: string) =>
    request<{ token: string; name: string }>(`/groups/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  getGroup: (code: string, token: string) =>
    request<{ code: string; name: string; createdAt: string }>(`/groups/${code}`, {
      headers: authHeaders(token),
    }),

  getParticipants: (code: string, token: string) =>
    request<Participant[]>(`/groups/${code}/participants`, { headers: authHeaders(token) }),

  addParticipant: (code: string, token: string, name: string) =>
    request<Participant>(`/groups/${code}/participants`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ name }),
    }),

  getExpenses: (code: string, token: string) =>
    request<Expense[]>(`/groups/${code}/expenses`, { headers: authHeaders(token) }),

  createExpense: (
    code: string,
    token: string,
    data: { description: string; amountCents: number; paidById: string; participantIds?: string[] },
  ) =>
    request<Expense>(`/groups/${code}/expenses`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteExpense: (code: string, token: string, id: string) =>
    request<void>(`/groups/${code}/expenses/${id}`, { method: 'DELETE', headers: authHeaders(token) }),

  getBalances: (code: string, token: string) =>
    request<{ balances: Balance[]; suggestedTransfers: Transfer[] }>(`/groups/${code}/balances`, {
      headers: authHeaders(token),
    }),

  recordPayment: (code: string, token: string, fromId: string, toId: string, amountCents: number) =>
    request<void>(`/groups/${code}/payments`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ fromId, toId, amountCents }),
    }),
};

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeaders(): HeadersInit {
  const token = readCookie('rachai_admin_csrf');
  return token ? { 'X-CSRF-Token': token } : {};
}

export interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  totalExpenses: number;
  totalVolumeCents: number;
  groupsByDay: { day: string; count: number }[];
}

export interface AdminGroupSummary {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  _count: { participants: number; expenses: number };
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ requiresTotp: boolean; tempToken?: string }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyTotp: (tempToken: string, code: string) =>
    request<{ ok: true }>('/admin/auth/totp/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),

  logout: () => request<{ ok: true }>('/admin/auth/logout', { method: 'POST', headers: csrfHeaders() }),

  dashboardStats: () => request<DashboardStats>('/admin/dashboard/stats'),

  dashboardGroups: () => request<AdminGroupSummary[]>('/admin/dashboard/groups'),

  deactivateGroup: (id: string) =>
    request<{ code: string; active: boolean }>(`/admin/groups/${id}/deactivate`, {
      method: 'POST',
      headers: csrfHeaders(),
    }),
};

export function formatCents(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: locale === 'pt' ? 'BRL' : 'USD',
  }).format(cents / 100);
}
