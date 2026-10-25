/** 
 * admission.routes.js — Admission CRUD routes (Phase 17)
 * 
 * GET    /api/admissions       Protected — list (filters, pagination)
 * GET    /api/admissions/:id   Protected — detail by _id
 * POST   /api/admissions       Protected — create
 * PUT    /api/admissions/:id   Protected — partial update
 * DELETE /api/admissions/:id   Protected — remove
 * 
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * The Phase 08 matrix grants admissions:read/write to admin, doctor,
 * and receptionist (see backend/config/permissions.js).
 */

const express = require('express');
const {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
} = require('../controllers/admission.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('admissions', 'read'), getAdmissions)
  .post(protect, requirePermission('admissions', 'write'), createAdmission);

router
  .route('/:id')
  .get(protect, requirePermission('admissions', 'read'), getAdmissionById)
  .put(protect, requirePermission('admissions', 'write'), updateAdmission)
  .delete(protect, requirePermission('admissions', 'write'), deleteAdmission);

module.exports = router;