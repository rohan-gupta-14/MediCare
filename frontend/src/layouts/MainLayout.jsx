/**
 * MainLayout.jsx — Primary layout wrapper for all dashboard pages
 *
 * Will contain:
 * - Sidebar navigation (Phase 09)
 * - Top navbar / header (Phase 09)
 * - Main content area
 *
 * For now it's a transparent passthrough so the app doesn't break.
 * Full implementation in Phase 09.
 */

import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
};

export default MainLayout;
