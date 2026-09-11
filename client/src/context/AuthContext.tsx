import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../utils/api";
import type { User } from "../types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  demo: (as?: string) => Promise<User>;
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
    const token = localStorage.getItem("pacto_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me().then(setUser).catch(() => localStorage.removeItem("pacto_token")).finally(() => setLoading(false));
  }, []);

  const refreshUser = async () => {
    const u = await api.auth.me();
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem("pacto_token", res.token);
    setUser(res.user);
    return res.user;
  };

  const demo = async (as?: string) => {
    const res = await api.auth.demo(as);
    localStorage.setItem("pacto_token", res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: any) => {
    const res = await api.auth.register(data);
    localStorage.setItem("pacto_token", res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("pacto_token");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, demo, register, logout, refreshUser, setUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
