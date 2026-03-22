import { createContext, useContext, useState, useEffect } from "react";
import api from "./Api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/me")
      .then((res) => setUser({ userId: res.data.userId }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    const handleExpired = () => {
      setUser(null); 
    };

    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  const login = (userData) => setUser(userData);

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
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