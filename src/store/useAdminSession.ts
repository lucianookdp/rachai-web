import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminSession {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAdminSession = create<AdminSession>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    { name: 'rachai-admin-session' },
  ),
);
