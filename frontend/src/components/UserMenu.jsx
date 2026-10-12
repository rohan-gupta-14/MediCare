/**
 * UserMenu — Header avatar dropdown (Phase 09)
 *
 * Shows the current user's initials, name and role; links to Dashboard,
 * marks Profile as "Soon" (Phase 41) and offers Logout.
 * Closes on outside click, Escape, or route change (state is derived from
 * the current pathname, so no setState-in-effect is needed).
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { roleLabel } from '../utils/permissions';

const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

const UserMenu = () => {
  // `openedAt` records the pathname the menu was opened on; a route change
  // makes the comparison fail, which closes the menu without an effect.
  const [openedAt, setOpenedAt] = useState(null);
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const containerRef = useRef(null);
  const open = openedAt === location.pathname;

  // Close when Escape is pressed or a click lands outside the menu
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenedAt(null);
    };
    const onClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenedAt(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const handleLogout = () => {
    setOpenedAt(null);
    // Hard redirect instead of navigate(): clearing auth while a
    // <ProtectedRoute> is mounted races its <Navigate to="/login">
    // against ours, and the guard can win. A full navigation to the
    // landing page is deterministic and resets all in-memory state
    // (same pattern services/api.js uses for expired sessions).
    logout();
    window.location.assign('/');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpenedAt(open ? null : location.pathname)}
        aria-label="Open user menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-emerald-100 bg-white py-1 pl-1 pr-2 shadow-sm transition-all hover:border-emerald-200 hover:shadow"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          {initialsOf(user?.name)}
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[10rem] truncate text-xs font-semibold text-gray-800">
            {user?.name || 'User'}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-emerald-600">
            {roleLabel(role)}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-xl"
        >
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="truncate text-sm font-semibold text-gray-800">{user?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {roleLabel(role)}
            </span>
          </div>

          <div className="p-2">
            <Link
              to="/dashboard"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>

            <span
              role="menuitem"
              aria-disabled="true"
              title="Profile arrives in Phase 41"
              className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400"
            >
              <span className="flex items-center gap-3">
                <User className="h-4 w-4" />
                Profile
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Soon
              </span>
            </span>

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
