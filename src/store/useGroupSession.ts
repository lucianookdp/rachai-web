import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GroupSession {
  code: string | null;
  name: string | null;
  token: string | null;
  setSession: (session: { code: string; name: string; token: string }) => void;
  clearSession: () => void;
}

export const useGroupSession = create<GroupSession>()(
  persist(
    (set) => ({
      code: null,
      name: null,
      token: null,
      setSession: ({ code, name, token }) => set({ code, name, token }),
      clearSession: () => set({ code: null, name: null, token: null }),
    }),
    { name: 'rachai-group-session' },
  ),
);
