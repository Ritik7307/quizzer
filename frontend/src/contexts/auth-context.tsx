"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { clearAuth, getToken, getUser, setAuth, type StoredUser } from "@/lib/auth-storage";
import type { User } from "@/types";

interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<StoredUser>;
  register: (name: string, email: string, password: string) => Promise<StoredUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      const { user: u } = await api<{ user: User }>("/api/auth/me", { token: t });
      setUser(u);
      setToken(t);
      setAuth(t, u);
    } catch {
      clearAuth();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (u && t) {
      setUser(u);
      setToken(t);
    }
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const data = await api<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuth(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setAuth(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
