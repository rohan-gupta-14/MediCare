/**
 * useAuth.js — Convenience hook for consuming the AuthContext
 *
 * Kept in a .js file (separate from AuthContext.jsx) so that the
 * react-refresh ESLint rule stays happy: component files (.jsx) must
 * only export components, which keeps Vite hot-reload working.
 *
 * Usage:
 *   import useAuth from '../hooks/useAuth';
 *   const { user, token, login, logout } = useAuth();
 *
 * Full value provided in Phase 07.
 */

import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const useAuth = () => useContext(AuthContext);

export default useAuth;
