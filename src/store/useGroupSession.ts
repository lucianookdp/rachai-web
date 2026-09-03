import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GroupSession {
  code: string | null;
  name: string | null;
  currency: string | null;
  token: string | null;
  setSession: (session: { code: string; name: string; currency: string; token: string }) => void;
  clearSession: () => void;
}

export const useGroupSession = create<GroupSession>()(
  persist(
    (set) => ({
      code: null,
      name: null,
      currency: null,
      token: null,
      setSession: ({ code, name, currency, token }) => set({ code, name, currency, token }),
      clearSession: () => set({ code: null, name: null, currency: null, token: null }),
    }),
    { name: 'rachai-group-session' },
  ),
);
