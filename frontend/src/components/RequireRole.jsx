/**
 * RequireRole — Role-based route guard (Phase 08)
 *
 * Must be nested inside ProtectedRoute (or otherwise authenticated).
 * - Wrong role → /unauthorized
 * - No role listed → treated as public access (no restriction)
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<RequireRole roles={['admin']} />}>
 *       <Route path="/admin" element={<AdminDashboard />} />
 *     </Route>
 *   </Route>
 */

import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const RequireRole = ({ roles }) => {
  const { role, isAuthenticated, loading } = useAuth();

  if (loading) return null; // ProtectedRoute above shows the loading screen
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles || roles.length === 0 || roles.includes(role)) return <Outlet />;

  return <Navigate to="/unauthorized" replace />;
};

export default RequireRole;
