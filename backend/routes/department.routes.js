/**
 * department.routes.js — Department CRUD routes (Phase 15)
 *
 * GET    /api/departments       Protected — list (search, filters, pagination)
 * GET    /api/departments/:id   Protected — detail by _id
 * POST   /api/departments       Protected — create
 * PUT    /api/departments/:id   Protected — partial update
 * DELETE /api/departments/:id   Protected — remove
 *
 * Every route runs protect (Phase 06) + requirePermission (Phase 08).
 * The Phase 08 matrix grants departments:* to admin alone.
 */

const express = require('express');
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/department.controller');
const { protect, requirePermission } = require('../middleware/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, requirePermission('departments', 'read'), getDepartments)
  .post(protect, requirePermission('departments', 'write'), createDepartment);

router
  .route('/:id')
  .get(protect, requirePermission('departments', 'read'), getDepartmentById)
  .put(protect, requirePermission('departments', 'write'), updateDepartment)
  .delete(protect, requirePermission('departments', 'write'), deleteDepartment);

module.exports = router;
