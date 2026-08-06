import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { mockUsers } from '../data/mock';
import { isFirebaseEnabled, initFirebase } from '../firebase/config';
import {
  fetchUserProfile,
  signInWithEmail,
  sendPasswordReset,
} from '../services/firebaseService';
import { isUserActive } from '../utils/permissions';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  splashDone: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setSplashDone: () => void;
  recoverPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      splashDone: false,
      setSplashDone: () => set({ splashDone: true }),

      login: async (email, password) => {
        if (!email || !password) {
          return { ok: false, error: 'Informe e-mail e senha.' };
        }

        if (isFirebaseEnabled) {
          try {
            await initFirebase();
            const cred = await signInWithEmail(email, password);
            const profile = await fetchUserProfile(cred.user.uid);
            if (!profile) {
              return {
                ok: false,
                error:
                  'Conta autenticada, mas sem perfil no Firestore. Execute o seed dos administradores.',
              };
            }
            if (!isUserActive(profile)) {
              return { ok: false, error: 'Esta conta está desativada.' };
            }
            set({ user: profile, isAuthenticated: true });
            return { ok: true };
          } catch (err) {
            return {
              ok: false,
              error:
                err instanceof Error
                  ? err.message
                  : 'Falha no login com Firebase.',
            };
          }
        }

        await new Promise((r) => setTimeout(r, 500));
        const found = mockUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase(),
        );
        if (!found) {
          return { ok: false, error: 'Usuário não encontrado.' };
        }
        if (password.length < 4) {
          return { ok: false, error: 'Senha inválida.' };
        }
        if (!isUserActive(found)) {
          return { ok: false, error: 'Esta conta está desativada.' };
        }
        set({ user: found, isAuthenticated: true });
        return { ok: true };
      },

      logout: () => {
        if (isFirebaseEnabled) {
          void (async () => {
            const { signOut } = await import('firebase/auth');
            const { getFirebaseAuth } = await import('../firebase/config');
            const auth = getFirebaseAuth();
            if (auth) await signOut(auth);
          })();
        }
        set({ user: null, isAuthenticated: false });
      },

      recoverPassword: async (email) => {
        if (!email) return { ok: false, message: 'Informe o e-mail cadastrado.' };
        if (isFirebaseEnabled) {
          try {
            await sendPasswordReset(email);
          } catch {
            /* still show generic message */
          }
        } else {
          await new Promise((r) => setTimeout(r, 700));
        }
        return {
          ok: true,
          message: 'Se o e-mail existir, enviaremos instruções de recuperação.',
        };
      },

      refreshProfile: async () => {
        const current = get().user;
        if (!current) return;
        const profile = await fetchUserProfile(current.uid);
        if (profile) set({ user: profile });
      },
    }),
    {
      name: 'nannai-auth-v4',
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);
