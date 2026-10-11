/**
 * permissions.js — Role-based access control matrix (Phase 08)
 *
 * Single source of truth for what each role may do. Resource routes
 * (Phases 11+) enforce it via requirePermission() in auth.middleware.js:
 *
 *   router.get('/', protect, requirePermission('appointments', 'read'), handler)
 *
 * Scope note: the matrix grants module-level access. Row-level scoping
 * ("patient can only see OWN appointments") is enforced inside the
 * resource controllers with owner filters (Phases 11+), not here.
 *
 * Roles (from User.model.js): admin, doctor, patient, receptionist,
 * pharmacist, lab_technician.
 */

const ACTIONS = ['read', 'write'];

// Every resource the API will expose (route names in server.js + spec)
const RESOURCES = [
  'patients',
  'doctors',
  'departments',
  'appointments',
  'admissions',
  'medicalRecords',
  'prescriptions',
  'pharmacy',
  'inventory',
  'labTests',
  'labReports',
  'billing',
  'wards',
  'users',
  'notifications',
];

/**
 * ROLE_PERMISSIONS — role → list of "resource:action" grants.
 * admin uses '*' (full access, including future resources).
 *
 * "Own" resources (patient role) are marked with the same grants;
 * controllers restrict rows to the owning user (Phases 11+).
 */
const ROLE_PERMISSIONS = {
  // Full access — everything, now and as new resources appear
  admin: ['*'],

  // Appointments, Patients, Medical records, Prescriptions
  doctor: [
    'appointments:read',
    'appointments:write',
    'patients:read',
    'medicalRecords:read',
    'medicalRecords:write',
    'prescriptions:read',
    'prescriptions:write',
  ],

  // Own appointments, own medical records, own prescriptions, own bills
  patient: [
    'appointments:read',
    'medicalRecords:read',
    'prescriptions:read',
    'billing:read',
  ],

  // Patients, Appointments, Admissions, Billing
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

  // Pharmacy, Prescriptions, Inventory
  pharmacist: [
    'pharmacy:read',
    'pharmacy:write',
    'prescriptions:read',
    'inventory:read',
    'inventory:write',
  ],

  // Laboratory, Test reports
  lab_technician: [
    'labTests:read',
    'labTests:write',
    'labReports:read',
    'labReports:write',
  ],
};

/**
 * can — Does this role hold the "resource:action" grant?
 * @param {string} role
 * @param {string} permission e.g. 'appointments:read'
 * @returns {boolean}
 */
const can = (role, permission) => {
  const grants = ROLE_PERMISSIONS[role];
  if (!grants) return false;
  return grants.includes('*') || grants.includes(permission);
};

/**
 * effectivePermissions — Expand a role's grants to a concrete list.
 * admin's '*' is resolved to every known resource × action.
 * @param {string} role
 * @returns {string[]} e.g. ['appointments:read', ...]
 */
const effectivePermissions = (role) => {
  const grants = ROLE_PERMISSIONS[role] || [];
  if (grants.includes('*')) {
    return RESOURCES.flatMap((resource) =>
      ACTIONS.map((action) => `${resource}:${action}`)
    );
  }
  return [...grants];
};

module.exports = {
  ACTIONS,
  RESOURCES,
  ROLE_PERMISSIONS,
  can,
  effectivePermissions,
};
