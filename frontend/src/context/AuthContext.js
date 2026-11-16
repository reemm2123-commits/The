import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, refreshSession } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = guest

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (_) {
      try {
        const { data } = await refreshSession();
        setUser(data);
      } catch (__) {
        setUser(false);
      }
    }
  }, []);

  useEffect(() => {
    // Returning from Google OAuth: AuthCallback establishes the session first
    if (window.location.hash?.includes("session_id=")) return;
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(false);
  };

  return <AuthContext.Provider value={{ user, setUser, logout, checkAuth }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
