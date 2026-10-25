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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api('/auth/me')
      .then((payload) => {
        if (active) setUser(payload.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleUnauthorized = () => setUser(null);
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
    setUser(payload.user);
    return payload.user;
  }, []);

  const register = useCallback(async (email, password) => {
    const payload = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (payload.authenticated) {
      setUser(payload.user);
    }
    return payload;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
  }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  }
  return context;
}
