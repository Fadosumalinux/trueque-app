import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../utils/api";
import type { User } from "../types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; username: string; password: string; displayName: string; zoneId?: string; role?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("trueque_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me().then(setUser).catch(() => localStorage.removeItem("trueque_token")).finally(() => setLoading(false));
  }, []);

  const refreshUser = async () => {
    const u = await api.auth.me();
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem("trueque_token", res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: any) => {
    const res = await api.auth.register(data);
    localStorage.setItem("trueque_token", res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("trueque_token");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
