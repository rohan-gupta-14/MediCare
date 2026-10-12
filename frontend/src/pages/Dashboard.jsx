/**
 * Dashboard — Placeholder protected page (Phase 07, restyled for Phase 09)
 *
 * Now rendered inside the MainLayout shell (sidebar + header), so it is a
 * normal content card instead of a full-screen page. Proves the auth loop
 * end-to-end: shows the current user, role access and logout.
 * Phase 10+ replaces the content with real role dashboards.
 */

import { LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { accessibleModules, MODULE_LABELS, roleLabel } from '../utils/permissions';

const Dashboard = () => {
  const { user, role, logout } = useAuth();

  const handleLogout = () => {
    // Hard redirect (not navigate()) so ProtectedRoute's <Navigate> can't
    // race us to /login — see UserMenu.handleLogout for details.
    logout();
    window.location.assign('/');
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="text-6xl mb-4" aria-hidden="true">🏥</div>
        <h1 className="text-3xl font-bold text-emerald-700 tracking-wide mb-2">
          Welcome, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-green-600 mb-1">
          You are logged in as{' '}
          <span className="font-semibold">{roleLabel(user?.role || role)}</span>
        </p>
        <p className="text-sm text-green-500 mb-8">{user?.email}</p>

        <p className="text-sm text-gray-500 mb-3">
          Role dashboards arrive in Phase 10+ — use the sidebar to move around
          the modules your role can access.
        </p>

        {/* Phase 08: modules your role can access */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
            Your access
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {accessibleModules(role).map((module) => (
              <span
                key={module}
                className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium"
              >
                {MODULE_LABELS[module] || module}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );};

export default Dashboard;
