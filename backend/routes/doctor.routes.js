/**
 * doctor.routes.js — Doctor CRUD routes (Phase 13)
 *
 * GET    /api/doctors       Protected — list (search, filters, pagination)
 * GET    /api/doctors/:id   Protected — detail by _id or DOC-0001
 * POST   /api/doctors       Protected — create
 * PUT    /api/doctors/:id   Protected — partial update
 * DELETE /api/doctors/:id   Protected — remove
 *
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * The RBAC matrix grants `doctors:*` to admin only (see config/permissions.js).
 */

const express = require('express');
const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require('../controllers/doctor.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('doctors', 'read'), getDoctors)
  .post(protect, requirePermission('doctors', 'write'), createDoctor);

router
  .route('/:id')
  .get(protect, requirePermission('doctors', 'read'), getDoctorById)
  .put(protect, requirePermission('doctors', 'write'), updateDoctor)
  .delete(protect, requirePermission('doctors', 'write'), deleteDoctor);

module.exports = router;
