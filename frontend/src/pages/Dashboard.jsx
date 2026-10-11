/**
 * Dashboard — Placeholder protected page (Phase 07)
 *
 * Proves the auth loop end-to-end: only reachable when authenticated,
 * shows the current user, and offers logout.
 * Phase 09 (layout) + Phase 10+ (role dashboards) will replace this.
 */

import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const Dashboard = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-100 to-green-200 flex items-center justify-center px-4">
      <div className="bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl p-10 w-full max-w-lg border border-green-200 text-center">
        <div className="text-6xl mb-4" aria-hidden="true">🏥</div>
        <h1 className="text-3xl font-bold text-emerald-700 tracking-wide mb-2">
          Welcome, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-green-600 mb-1">
          You are logged in as <span className="font-semibold">{user?.role || role}</span>
        </p>
        <p className="text-sm text-green-500 mb-8">{user?.email}</p>

        <p className="text-sm text-gray-500 mb-8">
          The full dashboard arrives in Phases 09–10 — this placeholder proves
          the authentication loop works end-to-end.
        </p>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
