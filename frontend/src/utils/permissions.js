/**
 * permissions.js — Frontend mirror of the RBAC matrix (Phase 08)
 *
 * UI ONLY — decides what to show/hide (menus, cards, links).
 * Real enforcement lives in the backend:
 *   backend/config/permissions.js + requirePermission() middleware.
 * Keep the two matrices in sync when adding resources/roles.
 */

// Mirrors backend ROLE_PERMISSIONS (backend/config/permissions.js)
export const ROLE_PERMISSIONS = {
  admin: ['*'], // full access
  doctor: [
    'appointments:read',
    'appointments:write',
    'patients:read',
    'medicalRecords:read',
    'medicalRecords:write',
    'prescriptions:read',
    'prescriptions:write',
  ],
  patient: [
    'appointments:read',
    'medicalRecords:read',
    'prescriptions:read',
    'billing:read',
  ],
  receptionist: [
    'patients:read',
    'patients:write',
    'appointments:read',
    'appointments:write',
    'admissions:read',
    'admissions:write',
    'billing:read',
    'billing:write',
  ],
  pharmacist: [
    'pharmacy:read',
    'pharmacy:write',
    'prescriptions:read',
    'inventory:read',
    'inventory:write',
  ],
  lab_technician: [
    'labTests:read',
    'labTests:write',
    'labReports:read',
    'labReports:write',
  ],
};

// Human-readable module names for chips/menus (Phase 09+ sidebar reuses these)
export const MODULE_LABELS = {
  patients: 'Patients',
  doctors: 'Doctors',
  departments: 'Departments',
  appointments: 'Appointments',
  admissions: 'Admissions',
  medicalRecords: 'Medical Records',
  prescriptions: 'Prescriptions',
  pharmacy: 'Pharmacy',
  inventory: 'Inventory',
  labTests: 'Lab Tests',
  labReports: 'Lab Reports',
  billing: 'Billing',
  wards: 'Wards',
  users: 'Staff',
  notifications: 'Notifications',
};

/**
 * can — UI-level check: does this role hold "resource:action"?
 */
export const can = (role, permission) => {
  const grants = ROLE_PERMISSIONS[role];
  if (!grants) return false;
  return grants.includes('*') || grants.includes(permission);
};

/**
 * accessibleModules — unique module names a role can at least read.
 * Used by the placeholder Dashboard to show what's coming per role.
 */
export const accessibleModules = (role) => {
  const grants = ROLE_PERMISSIONS[role] || [];
  if (grants.includes('*')) return Object.keys(MODULE_LABELS);
  return [...new Set(grants.map((g) => g.split(':')[0]))];
};

// Human-readable role names for menus/badges (Phase 09 header + sidebar)
export const ROLE_LABELS = {
  admin: 'Administrator',
  doctor: 'Doctor',
  patient: 'Patient',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
};

/** roleLabel — pretty name for a role (falls back to the raw value). */
export const roleLabel = (role) => ROLE_LABELS[role] || role;

/**
 * roleHome — Where each role lands after login.
 * Admin gets the analytics dashboard (Phase 10); everyone else stays on
 * the generic /dashboard until their role dashboard ships
 * (doctor → Phase 19, patient → Phase 20, …).
 */
export const roleHome = (role) => (role === 'admin' ? '/admin' : '/dashboard');
