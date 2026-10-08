/**
 * AuthContext — React context for authentication state
 *
 * This context will hold:
 * - currentUser (the logged-in user object)
 * - token (JWT from localStorage)
 * - login() / logout() functions
 * - isAuthenticated
 * - role-based helpers
 *
 * Consume it via: import useAuth from '../hooks/useAuth';
 * (useAuth lives in its own file so this .jsx file only exports
 * components/context — required by the react-refresh ESLint rule.)
 *
 * AuthProvider component: full implementation in Phase 07.
 */

import { createContext } from 'react';

const AuthContext = createContext(null);

export default AuthContext;
