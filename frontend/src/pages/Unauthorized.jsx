/**
 * Unauthorized — 403 page (Phase 08)
 *
 * Shown when an authenticated user opens a route their role
 * does not permit (via RequireRole).
 */

import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const Unauthorized = () => {
  const { role } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-100 to-green-200 px-4">
      <div className="bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl p-10 w-full max-w-md border border-green-200 text-center">
        <ShieldAlert className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-emerald-700 tracking-wide mb-2">
          Access denied
        </h1>
        <p className="text-green-600 mb-2">
          Your account role <span className="font-semibold">{role}</span> does not
          have permission to view this page.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          If you believe this is a mistake, contact an administrator.
        </p>
        <Link
          to="/dashboard"
          className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
