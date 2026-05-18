// frontend/src/lib/auth.tsx
// Contexto de autenticación admin.
// - Persiste el token en localStorage.
// - Expone hooks: useAuth(), useRequireAdmin().
// - Verifica heartbeat al cargar para detectar tokens expirados.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { adminHeartbeat, adminLogin } from '@/api/admin';

const STORAGE_KEY = 'acacia.admin.token';
const STORAGE_EXP = 'acacia.admin.exp';

interface AuthState {
  token:     string | null;
  expiresAt: string | null;
  ready:     boolean; // true cuando ya verificamos el token persistido
}

interface AuthContextValue extends AuthState {
  login:  (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    // Hidratamos desde localStorage en el primer render
    const token     = localStorage.getItem(STORAGE_KEY);
    const expiresAt = localStorage.getItem(STORAGE_EXP);
    return { token, expiresAt, ready: false };
  });

  // Al cargar, validar heartbeat si hay token guardado.
  useEffect(() => {
    if (!state.token) {
      setState((s) => ({ ...s, ready: true }));
      return;
    }
    let cancelled = false;
    adminHeartbeat(state.token).then((ok) => {
      if (cancelled) return;
      if (!ok) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_EXP);
        setState({ token: null, expiresAt: null, ready: true });
      } else {
        setState((s) => ({ ...s, ready: true }));
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (password: string) => {
    const { token, expiresAt } = await adminLogin(password);
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(STORAGE_EXP, expiresAt);
    setState({ token, expiresAt, ready: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXP);
    setState({ token: null, expiresAt: null, ready: true });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
