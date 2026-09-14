import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GroupRole = 'editor' | 'viewer';

interface GroupSession {
  code: string | null;
  name: string | null;
  currency: string | null;
  token: string | null;
  role: GroupRole | null;
  setSession: (session: { code: string; name: string; currency: string; token: string; role: GroupRole }) => void;
  clearSession: () => void;
}

export const useGroupSession = create<GroupSession>()(
  persist(
    (set) => ({
      code: null,
      name: null,
      currency: null,
      token: null,
      role: null,
      setSession: ({ code, name, currency, token, role }) => set({ code, name, currency, token, role }),
      clearSession: () => set({ code: null, name: null, currency: null, token: null, role: null }),
    }),
    { name: 'rachai-group-session' },
  ),
);
