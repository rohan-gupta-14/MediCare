/**
 * ProtectedRoute — Route guard (Phase 07)
 *
 * Renders its child routes only when authenticated.
 * - While the session is being restored → loading screen
 * - Not authenticated → redirect to /login, remembering where the
 *   user was headed (location.state.from) so we can send them back
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-100 to-green-200">
        <div className="text-emerald-600 text-lg font-semibold animate-pulse">
          Checking your session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
