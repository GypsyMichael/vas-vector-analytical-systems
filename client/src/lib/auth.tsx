import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

interface User {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  isOwner: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; email?: string; displayName?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const OPEN_ACCESS_MODE = false;

const GUEST_USER: User = {
  id: "open-access-user",
  username: "guest",
  email: "guest@vas.local",
  displayName: "Guest User",
  isAdmin: true,
  isOwner: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(OPEN_ACCESS_MODE ? GUEST_USER : null);
  const [isLoading, setIsLoading] = useState(OPEN_ACCESS_MODE ? false : true);

  useEffect(() => {
    if (OPEN_ACCESS_MODE) return;
    const token = localStorage.getItem("vectoras-token");
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Invalid token");
        })
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem("vectoras-token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    localStorage.setItem("vectoras-token", data.token);
    setUser(data.user);
    queryClient.clear();
  }, []);

  const register = useCallback(async (data: { username: string; password: string; email?: string; displayName?: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    localStorage.setItem("vectoras-token", result.token);
    setUser(result.user);
    queryClient.clear();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vectoras-token");
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
