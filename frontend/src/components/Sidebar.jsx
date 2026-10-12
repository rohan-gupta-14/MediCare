/**
 * Sidebar — Role-aware dashboard navigation (Phase 09)
 *
 * - Desktop (lg+): fixed left rail, always visible.
 * - Mobile: off-canvas drawer toggled by the header hamburger;
 *   tapping the dimmed overlay or pressing Escape closes it.
 * - Visibility comes from the RBAC matrix (utils/permissions.js) via
 *   visibleNavSections(); links whose page isn't built yet render
 *   dimmed with a "Soon" badge instead of dead 404 links.
 */

import { NavLink, Link } from 'react-router-dom';
import { X } from 'lucide-react';
import logo from '../assets/logo.png';
import useAuth from '../hooks/useAuth';
import { roleLabel } from '../utils/permissions';
import { visibleNavSections } from '../utils/navigation';

const linkClasses = ({ isActive }) =>
  [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
  ].join(' ');

const disabledClasses =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed select-none';

const Sidebar = ({ open, onClose }) => {
  const { role, user } = useAuth();
  const sections = visibleNavSections(role);

  return (
    <>
      {/* Dimmed overlay — mobile drawer only */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Dashboard navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 lg:w-64 flex-col',
          'border-r border-emerald-100 bg-white shadow-lg lg:shadow-none',
          'transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-emerald-100 px-4">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-emerald-300 shadow-sm">
              <img src={logo} alt="MediCare Logo" className="h-full w-full object-cover" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight text-emerald-700">MediCare</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-500">
                Hospital MS
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <>
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {!item.enabled && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Soon
                        </span>
                      )}
                    </>
                  );

                  return (
                    <li key={item.path}>
                      {item.enabled ? (
                        <NavLink to={item.path} className={linkClasses} onClick={onClose}>
                          {content}
                        </NavLink>
                      ) : (
                        <span
                          className={disabledClasses}
                          aria-disabled="true"
                          title={`${item.label} arrives in a later phase`}
                        >
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer — current role */}
        <div className="shrink-0 border-t border-emerald-100 px-4 py-3">
          <p className="truncate text-xs text-gray-500">
            Signed in as{' '}
            <span className="font-semibold text-emerald-700">{roleLabel(role)}</span>
          </p>
          {user?.name && <p className="truncate text-xs text-gray-400">{user.name}</p>}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
