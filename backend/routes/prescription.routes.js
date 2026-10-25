/** 
 * prescription.routes.js — Prescription CRUD routes (Phase 21)
 * 
 * GET    /api/prescriptions       Protected — list (filters, pagination)
 * GET    /api/prescriptions/:id   Protected — detail by _id
 * POST   /api/prescriptions       Protected — create
 * PUT    /api/prescriptions/:id   Protected — partial update
 * DELETE /api/prescriptions/:id   Protected — remove
 * 
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * The Phase 08 matrix grants prescriptions:read/write to admin, doctor,
 * and receptionist (see backend/config/permissions.js).
 */

const express = require('express');
const {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescription.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('prescriptions', 'read'), getPrescriptions)
  .post(protect, requirePermission('prescriptions', 'write'), createPrescription);

router
  .route('/:id')
  .get(protect, requirePermission('prescriptions', 'read'), getPrescriptionById)
  .put(protect, requirePermission('prescriptions', 'write'), updatePrescription)
  .delete(protect, requirePermission('prescriptions', 'write'), deletePrescription);

module.exports = router;