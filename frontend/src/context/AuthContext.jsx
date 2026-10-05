/**
 * AuthContext — placeholder for Phase 07
 *
 * This context will hold:
 * - currentUser (the logged-in user object)
 * - token (JWT from localStorage)
 * - login() / logout() functions
 * - isAuthenticated
 * - role-based helpers
 *
 * Full implementation in Phase 07.
 */

import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
