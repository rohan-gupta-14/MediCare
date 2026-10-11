/**
 * AuthContext — React context for authentication state (Phase 07)
 *
 * Holds:
 * - user        (current user object or null)
 * - token       (JWT string or null)
 * - loading     (true while the session is being restored from localStorage)
 * - isAuthenticated, role
 * - login() / register() / logout()
 *
 * On mount, if a token exists but no cached user, the session is restored
 * via GET /api/auth/me (current-user handling). A 401 anywhere clears the
 * session and redirects to /login (see services/api.js interceptor).
 *
 * Consume it via: import useAuth from '../hooks/useAuth';
 *
 * Note: the token is stored as a raw string in localStorage (not JSON) —
 * services/api.js reads it directly with localStorage.getItem().
 */

import { createContext, useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const TOKEN_KEY = 'medicare_token';
const USER_KEY = 'medicare_user';

const readCachedUser = () => {
  // A cached user without a token is stale — ignore it
  if (!localStorage.getItem(TOKEN_KEY)) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY) && !readCachedUser());

  // ── Session persistence helpers ─────────────────────────────────
  const persistSession = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // ── API actions ─────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    persistSession(newToken, newUser);
    return newUser;
  }, [persistSession]);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { token: newToken, user: newUser } = res.data.data;
    persistSession(newToken, newUser);
    return newUser;
  }, [persistSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  // ── Restore/refresh session on mount and after login ───────────
  useEffect(() => {
    if (!token) {
      // No session to restore — user was never hydrated without a token
      return undefined;
    }
    // loading is already true from the initial state when a token exists
    // without a cached user; the post-login refresh happens silently.
    let active = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (!active) return;
        const freshUser = res.data.data;
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      })
      .catch(() => {
        // 401 interceptor already cleared storage + redirected;
        // this just syncs in-memory state.
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    role: user?.role || null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
