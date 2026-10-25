/** 
 * medicalRecord.routes.js — Medical record CRUD routes (Phase 18)
 * 
 * GET    /api/medical-records       Protected — list (filters, pagination)
 * GET    /api/medical-records/:id   Protected — detail by _id
 * POST   /api/medical-records       Protected — create
 * PUT    /api/medical-records/:id   Protected — partial update
 * DELETE /api/medical-records/:id   Protected — remove
 * 
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * The Phase 08 matrix grants medicalRecords:read/write to admin, doctor,
 * and receptionist (see backend/config/permissions.js).
 */

const express = require('express');
const {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
} = require('../controllers/medicalRecord.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('medicalRecords', 'read'), getMedicalRecords)
  .post(protect, requirePermission('medicalRecords', 'write'), createMedicalRecord);

router
  .route('/:id')
  .get(protect, requirePermission('medicalRecords', 'read'), getMedicalRecordById)
  .put(protect, requirePermission('medicalRecords', 'write'), updateMedicalRecord)
  .delete(protect, requirePermission('medicalRecords', 'write'), deleteMedicalRecord);

module.exports = router;