import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../types/auth";
import api from "../services/api";

interface Ctx {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const logout = () => {
    localStorage.removeItem("assistdoc_token");
    localStorage.removeItem("assistdoc_user");
    setToken(null);
    setUser(null);
  };

  const login = (nextToken: string, nextUser: User) => {
    localStorage.setItem("assistdoc_token", nextToken);
    localStorage.setItem("assistdoc_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  useEffect(() => {
    let active = true;
    const storedToken = localStorage.getItem("assistdoc_token");
    const storedUser = localStorage.getItem("assistdoc_user");

    if (!storedToken) {
      setIsHydrating(false);
      return;
    }

    setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("assistdoc_user");
      }
    }

    api
      .get("/auth/me")
      .then((response) => {
        if (!active) return;
        const nextUser = response.data?.data?.user;
        if (nextUser) {
          localStorage.setItem("assistdoc_user", JSON.stringify(nextUser));
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("assistdoc:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("assistdoc:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isHydrating,
      login,
      logout,
    }),
    [user, token, isHydrating],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
