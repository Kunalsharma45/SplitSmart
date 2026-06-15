import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../lib/api';

type User = {
  id: string;
  username: string;
  email?: string;
};

type AuthContextState = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('expense_access_token');
    if (accessToken) {
      api.get('/auth/me/').then((response) => setUser(response.data.data)).catch(() => setUser(null));
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login/', { username, password });
    localStorage.setItem('expense_access_token', response.data.access);
    localStorage.setItem('expense_refresh_token', response.data.refresh);
    const userResponse = await api.get('/auth/me/');
    setUser(userResponse.data.data);
  };

  const register = async (username: string, email: string, password: string) => {
    await api.post('/auth/register/', { username, email, password });
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('expense_access_token');
    localStorage.removeItem('expense_refresh_token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
