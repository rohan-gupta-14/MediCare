/** 
 * labTest.routes.js — Lab test CRUD routes (Phase 22)
 * 
 * GET    /api/lab-tests       Protected — list (filters, pagination)
 * GET    /api/lab-tests/:id   Protected — detail by _id
 * POST   /api/lab-tests       Protected — create
 * PUT    /api/lab-tests/:id   Protected — partial update
 * DELETE /api/lab-tests/:id   Protected — remove
 * 
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * The Phase 08 matrix grants labTests:read/write to admin, doctor,
 * and receptionist (see backend/config/permissions.js).
 */

const express = require('express');
const {
  getLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest,
} = require('../controllers/labTest.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('labTests', 'read'), getLabTests)
  .post(protect, requirePermission('labTests', 'write'), createLabTest);

router
  .route('/:id')
  .get(protect, requirePermission('labTests', 'read'), getLabTestById)
  .put(protect, requirePermission('labTests', 'write'), updateLabTest)
  .delete(protect, requirePermission('labTests', 'write'), deleteLabTest);

module.exports = router;