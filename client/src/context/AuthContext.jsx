import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api('/auth/me')
      .then((payload) => {
        if (active) setAdmin(payload.admin);
      })
      .catch(() => {
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleUnauthorized = () => setAdmin(null);
    window.addEventListener('bankide:unauthorized', handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener('bankide:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const payload = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAdmin(payload.admin);
    return payload.admin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setAdmin(null);
    }
  }, []);

  const value = useMemo(() => ({
    admin,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(admin),
  }), [admin, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  }
  return context;
}
