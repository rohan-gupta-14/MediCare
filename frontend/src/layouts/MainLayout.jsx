/**
 * MainLayout.jsx — Primary layout wrapper for all dashboard pages (Phase 09)
 *
 * Shell structure:
 *   ┌──────────┬─────────────────────────────┐
 *   │          │ Header (sticky)             │
 *   │ Sidebar  ├─────────────────────────────┤
 *   │  (rail / │ Page container <Outlet />   │
 *   │  drawer) │                             │
 *   └──────────┴─────────────────────────────┘
 *
 * - Sidebar: fixed rail on lg+, off-canvas drawer below lg.
 * - Drawer state lives here: opened by the header hamburger, closed by the
 *   overlay, Escape, or any route change. The open flag is *derived* —
 *   `openedAt` stores the pathname the drawer was opened on, so navigating
 *   away closes it without a setState-in-effect.
 */

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout = () => {
  const { pathname } = useLocation();
  const [openedAt, setOpenedAt] = useState(null);
  const sidebarOpen = openedAt === pathname;

  // Close the drawer with Escape
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenedAt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setOpenedAt(null)}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header onMenuToggle={() => setOpenedAt(sidebarOpen ? null : pathname)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-emerald-100 bg-white px-4 py-4 text-center text-xs text-gray-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} MediCare — Hospital Management System
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
