/**
 * Header — Dashboard top bar (Phase 09)
 *
 * Sticky bar above the page container:
 * - Hamburger (below lg) → opens the mobile sidebar drawer
 * - Page title derived from the current route (utils/navigation.js)
 * - Notification area (NotificationBell) + user menu (UserMenu)
 */

import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import { titleForPath } from '../utils/navigation';

const Header = ({ onMenuToggle }) => {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: hamburger + page title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Open navigation"
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-800">{title}</h1>
            <p className="hidden truncate text-xs text-gray-500 sm:block">
              MediCare hospital management
            </p>
          </div>
        </div>

        {/* Right: notifications + user */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
