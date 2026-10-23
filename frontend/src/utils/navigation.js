/**
 * navigation.js — Sidebar navigation config (Phase 09)
 *
 * Single source of truth for the dashboard sidebar and the header page title.
 *
 * Item shape:
 *   label      optional display label (defaults to MODULE_LABELS[module])
 *   module     RBAC module key from utils/permissions.js — controls visibility
 *              (the item shows only if the role can at least read that module)
 *   always     true → visible to every role (e.g. Dashboard)
 *   roles      optional allow-list — item only shows for these roles
 *              (checked in addition to always/module visibility)
 *   path       route to link to
 *   icon       lucide-react icon component
 *   enabled    true → clickable NavLink. false → rendered dimmed with a
 *              "Soon" badge (route not built yet). Flip to true in the phase
 *              that ships the page — never leave dead links in the sidebar.
 *
 * Keep in sync with backend/config/permissions.js when adding modules.
 */

import {
  LayoutDashboard,
  BarChart3,
  Users,
  Stethoscope,
  Building2,
  CalendarDays,
  ClipboardList,
  Pill,
  Package,
  TestTube,
  Receipt,
  BedDouble,
  FileText,
  Settings,
} from 'lucide-react';
import { accessibleModules, MODULE_LABELS } from './permissions';

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, always: true, enabled: true },
      // Phase 10 — admin-only analytics (RequireRole guards the route too)
      { label: 'Admin Dashboard', path: '/admin', icon: BarChart3, always: true, roles: ['admin'], enabled: true },
    ],
  },
  {
    title: 'Management',
    items: [
      // Phase 12 — patient management is live (list + details routes)
      { module: 'patients', path: '/patients', icon: Users, enabled: true },
      // Phase 14 — doctor management is live (admin-only per the RBAC matrix)
      { module: 'doctors', path: '/doctors', icon: Stethoscope, enabled: true },
      // Phase 15 — department management is live (admin-only per the RBAC matrix)
      { module: 'departments', path: '/departments', icon: Building2, enabled: true },
      { module: 'appointments', path: '/appointments', icon: CalendarDays },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { module: 'medicalRecords', path: '/records', icon: ClipboardList },
      { module: 'prescriptions', path: '/prescriptions', icon: Pill },
      { module: 'admissions', path: '/admissions', icon: FileText },
      { module: 'wards', path: '/wards', icon: BedDouble },
    ],
  },
  {
    title: 'Pharmacy & Lab',
    items: [
      { module: 'pharmacy', path: '/pharmacy', icon: Package },
      { module: 'inventory', path: '/inventory', icon: Package },
      { module: 'labTests', path: '/lab-tests', icon: TestTube },
      { module: 'labReports', path: '/lab-reports', icon: FileText },
    ],
  },
  {
    title: 'Finance & Admin',
    items: [
      { module: 'billing', path: '/billing', icon: Receipt },
      { module: 'users', path: '/staff', icon: Users },
      { label: 'Settings', path: '/settings', icon: Settings, always: true },
    ],
  },
];

/** All nav items flattened (used for header titles). */
const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * visibleNavSections — sections filtered down to what `role` may see.
 * Each item gets its final label so components stay dumb.
 */
export const visibleNavSections = (role) => {
  const modules = accessibleModules(role);
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter(
        (item) =>
          (!item.roles || item.roles.includes(role)) &&
          (item.always || (item.module && modules.includes(item.module)))
      )
      .map((item) => ({
        ...item,
        label: item.label || MODULE_LABELS[item.module] || item.module,
      })),
  })).filter((section) => section.items.length > 0);
};

/**
 * titleForPath — header page title for the current route.
 * Falls back to "Dashboard" for unknown paths.
 */
export const titleForPath = (pathname) => {
  const match = ALL_ITEMS.find((item) => item.path === pathname);
  if (match) return match.label || MODULE_LABELS[match.module] || 'Dashboard';
  // Detail routes inherit their section's title (Phase 12:
  // /patients/PAT-0001 → "Patients")
  const parent = ALL_ITEMS.find((item) => item.path !== '/' && pathname.startsWith(`${item.path}/`));
  if (parent) return parent.label || MODULE_LABELS[parent.module] || 'Dashboard';
  return 'Dashboard';
};
