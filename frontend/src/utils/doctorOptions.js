/**
 * doctorOptions.js — Shared constants for the doctor UI (Phase 14)
 *
 * Mirrors the backend enums in `backend/models/Doctor.model.js`
 * (Doctor.SPECIALIZATIONS / Doctor.DAYS) — keep the two in sync when
 * adding a specialization.
 */

export const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'ENT',
  'General Medicine',
  'Gynecology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Surgery',
  'Urology',
];

export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** monday → "Mon" (schedule chips). */
export const dayLabel = (day) => (day ? day.slice(0, 3).replace(/^./, (c) => c.toUpperCase()) : '');

/** ₹800 — consultation-fee formatter (en-IN, no paise). */
export const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
