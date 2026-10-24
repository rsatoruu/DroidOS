import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@droidos/shared';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  setupRequired: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setSetupRequired: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      setupRequired: false,
      login: (user, token) => set({ isAuthenticated: true, user, token }),
      logout: () => set({ isAuthenticated: false, user: null, token: null }),
      setSetupRequired: (v) => set({ setupRequired: v }),
    }),
    {
      name: 'droidos-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
