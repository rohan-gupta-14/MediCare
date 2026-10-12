/**
 * NotificationBell — Header notification area (Phase 09)
 *
 * UI shell only: the dropdown renders an empty state for now.
 * Real notifications (unread count, mark-as-read) arrive in Phase 38
 * when the Notification model + API exist.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Inbox } from 'lucide-react';

const NotificationBell = () => {
  // `openedAt` records the pathname the panel was opened on; a route change
  // makes the comparison fail, closing the panel without setState-in-effect.
  const [openedAt, setOpenedAt] = useState(null);
  const location = useLocation();
  const containerRef = useRef(null);
  const open = openedAt === location.pathname;

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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpenedAt(open ? null : location.pathname)}
        aria-label="View notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-full border border-emerald-100 bg-white p-2.5 text-gray-600 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-700 hover:shadow"
      >
        <Bell className="h-[18px] w-[18px]" />
        {/* Unread-count badge is added here in Phase 38 */}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 border border-emerald-100">
              0 unread
            </span>
          </div>

          <div className="flex flex-col items-center px-4 py-8 text-center">
            <Inbox className="mb-3 h-10 w-10 text-emerald-300" />
            <p className="text-sm font-medium text-gray-600">No notifications yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Appointment, prescription and lab alerts will appear here once the
              notification system lands in Phase 38.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
