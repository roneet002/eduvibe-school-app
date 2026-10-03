import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, setAuthToken, type User } from "@/src/api/school";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "eduvibe-session-token";

export type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  loginWithPassword: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; role: "student" | "admin" }) => Promise<void>;
  completeGoogleSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, token: null });

  const applySession = useCallback(async (token: string, user: User) => {
    setAuthToken(token);
    await storage.secureSet(TOKEN_KEY, token);
    setState({ status: "authenticated", user, token });
  }, []);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setState({ status: "unauthenticated", user: null, token: null });
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await storage.secureGet<string>(TOKEN_KEY, "");
      if (!stored) {
        setState({ status: "unauthenticated", user: null, token: null });
        return;
      }
      setAuthToken(stored);
      try {
        const { user } = await api.me();
        setState({ status: "authenticated", user, token: stored });
      } catch {
        setAuthToken(null);
        await storage.secureRemove(TOKEN_KEY);
        setState({ status: "unauthenticated", user: null, token: null });
      }
    })();
  }, []);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const { session_token, user } = await api.login({ email, password });
      await applySession(session_token, user);
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; role: "student" | "admin" }) => {
      const { session_token, user } = await api.register(payload);
      await applySession(session_token, user);
    },
    [applySession],
  );

  const completeGoogleSession = useCallback(
    async (sessionId: string) => {
      const { session_token, user } = await api.session(sessionId);
      await applySession(session_token, user);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, loginWithPassword, register, completeGoogleSession, logout }),
    [state, loginWithPassword, register, completeGoogleSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
