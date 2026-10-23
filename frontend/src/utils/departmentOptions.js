/**
 * departmentOptions.js — shared department UI constants (Phase 15)
 *
 * Mirrors the backend enums in models/Department.model.js so the UI and
 * API never drift apart (same pattern as doctorOptions.js in Phase 14).
 */

export const DEPARTMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const statusLabel = (status) =>
  DEPARTMENT_STATUSES.find((s) => s.value === status)?.label || status || '—';
