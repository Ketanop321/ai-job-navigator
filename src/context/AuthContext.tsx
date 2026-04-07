import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentUser, loginUser, registerUser } from "@/lib/api";
import { clearStoredToken, getStoredToken, storeToken } from "@/lib/session";
import type { AuthUser } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (credentials: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const existingToken = getStoredToken();

      if (!existingToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(existingToken);
        setToken(existingToken);
        setUser(currentUser);
      } catch {
        clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await loginUser(credentials);
    storeToken(response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const register = async (credentials: { name: string; email: string; password: string }) => {
    const response = await registerUser(credentials);
    storeToken(response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider };
