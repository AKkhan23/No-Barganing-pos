import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anonymous
  const [loading, setLoading] = useState(true);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const token = localStorage.getItem("pos_token");
    const cached = localStorage.getItem("pos_user");
    if (!token) {
      setUser(false);
      setLoading(false);
      return;
    }
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { localStorage.removeItem('pos_user'); }
    }
    let retries = 0;
    const check = () => {
      if (cancelled.current) return;
      api.get("/auth/me").then((r) => {
        if (cancelled.current) return;
        setUser(r.data);
        localStorage.setItem("pos_user", JSON.stringify(r.data));
        setLoading(false);
      }).catch(() => {
        if (cancelled.current) return;
        if (retries < 3) {
          retries++;
          setTimeout(check, retries * 3000);
        } else {
          localStorage.removeItem("pos_token");
          localStorage.removeItem("pos_user");
          setUser(false);
          setLoading(false);
        }
      });
    };
    check();
    return () => { cancelled.current = true; };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("pos_token", data.token);
    localStorage.setItem("pos_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
    setUser(false);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
