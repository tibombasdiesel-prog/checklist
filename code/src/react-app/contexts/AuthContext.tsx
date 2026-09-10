import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, RegisterRequest, LoginRequest, AuthResponse } from "../../shared/auth-types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: 'include',
      });
      const data: AuthResponse = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data: AuthResponse = await response.json();
    
    if (data.success && data.user) {
      if (data.token) {
        localStorage.setItem("checklist_token", data.token);
      }
      setUser(data.user);
    }

    return data;
  };

  const register = async (registerData: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify(registerData),
    });

    const data: AuthResponse = await response.json();
    
    if (data.success && data.user) {
      if (data.token) {
        localStorage.setItem("checklist_token", data.token);
      }
      setUser(data.user);
    }

    return data;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem("checklist_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
