/**
 * patient.routes.js — Patient CRUD routes (Phase 11)
 *
 * GET    /api/patients       Protected — list (search, filters, pagination)
 * GET    /api/patients/:id   Protected — detail by _id or PAT-0001
 * POST   /api/patients       Protected — create
 * PUT    /api/patients/:id   Protected — partial update
 * DELETE /api/patients/:id   Protected — remove
 *
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * Row-level ownership is applied inside the controller.
 */

const express = require('express');
const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patient.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('patients', 'read'), getPatients)
  .post(protect, requirePermission('patients', 'write'), createPatient);

router
  .route('/:id')
  .get(protect, requirePermission('patients', 'read'), getPatientById)
  .put(protect, requirePermission('patients', 'write'), updatePatient)
  .delete(protect, requirePermission('patients', 'write'), deletePatient);

module.exports = router;
