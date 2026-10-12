/**
 * mockAdminStats.js — Sample admin dashboard data (Phase 10)
 *
 * WHY MOCK: the models behind these numbers don't exist yet
 * (Patient → Phase 11, Doctor → Phase 13, Appointment → Phase 16,
 * Ward/Bed → Phase 30, Invoice → Phase 33). Phase 10 builds the
 * dashboard UI + charts so each later phase only swaps the data source.
 *
 * SWAP-IN PLAN (one file, one hook):
 *   1. Backend: add GET /api/stats/admin (aggregation pipeline) in the
 *      phase that completes the last model.
 *   2. Frontend: replace the body of hooks/useAdminStats.js with
 *      `api.get('/stats/admin')` returning the same shapes as below.
 *   Nothing else in the UI changes.
 */

/** Headline numbers shown in the stat cards. */
export const ADMIN_STATS = {
  totalPatients: 1284,
  totalDoctors: 42,
  todayAppointments: 27,
  pendingAppointments: 11,
  revenueThisMonth: 1845000, // ₹
  availableBeds: 36,
  occupiedBeds: 84,
};

/** Total patients over the last 6 months (growth curve). */
export const PATIENT_GROWTH = [
  { month: 'May', patients: 642 },
  { month: 'Jun', patients: 751 },
  { month: 'Jul', patients: 878 },
  { month: 'Aug', patients: 996 },
  { month: 'Sep', patients: 1142 },
  { month: 'Oct', patients: 1284 },
];

/** Appointments per month, split by outcome. */
export const APPOINTMENT_STATS = [
  { month: 'May', completed: 214, cancelled: 26 },
  { month: 'Jun', completed: 238, cancelled: 31 },
  { month: 'Jul', completed: 265, cancelled: 22 },
  { month: 'Aug', completed: 291, cancelled: 35 },
  { month: 'Sep', completed: 318, cancelled: 28 },
  { month: 'Oct', completed: 342, cancelled: 24 },
];

/** Revenue per month in ₹. */
export const REVENUE_STATS = [
  { month: 'May', revenue: 1180000 },
  { month: 'Jun', revenue: 1325000 },
  { month: 'Jul', revenue: 1462000 },
  { month: 'Aug', revenue: 1590000 },
  { month: 'Sep', revenue: 1710000 },
  { month: 'Oct', revenue: 1845000 },
];
