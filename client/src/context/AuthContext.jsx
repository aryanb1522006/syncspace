import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../api/resources.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('syncspace-user');
    return saved ? JSON.parse(saved) : null;
  });

  const commit = (payload) => {
    localStorage.setItem('syncspace-token', payload.token);
    localStorage.setItem('syncspace-user', JSON.stringify(payload.user));
    setUser(payload.user);
    return payload.user;
  };

  const value = useMemo(() => ({
    user,
    login: async (input) => commit(await api.login(input)),
    register: async (input) => commit(await api.register(input)),
    googleLogin: async (credential) => commit(await api.googleLogin(credential)),
    logout: () => {
      localStorage.removeItem('syncspace-token');
      localStorage.removeItem('syncspace-user');
      setUser(null);
    }
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
