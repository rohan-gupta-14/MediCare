/**
 * department.controller.js — Department CRUD (Phase 15)
 *
 * Endpoints (see routes/department.routes.js):
 *  - GET    /api/departments       list — search + status filter + pagination
 *  - GET    /api/departments/:id   detail — accepts Mongo _id
 *  - POST   /api/departments       create
 *  - PUT    /api/departments/:id   update (partial)
 *  - DELETE /api/departments/:id   remove
 *
 * Authorization: protect + requirePermission('departments', read|write)
 * (Phase 08 matrix grants departments:* to admin alone).
 */

const Department = require('../models/Department.model');
const Doctor = require('../models/Doctor.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/** Escape user input before building a RegExp (prevents ReDoS/injection). */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Manual validation for create — returns an error message or null. */
const validateFields = ({ name, status, description, location }) => {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Department name is required (min 2 characters)';
  }
  if (name.trim().length > 100) return 'Department name cannot exceed 100 characters';
  if (status !== undefined && status !== '' && !Department.STATUSES.includes(status)) {
    return `Status must be one of: ${Department.STATUSES.join(', ')}`;
  }
  if (description !== undefined && description !== null && String(description).length > 1000) {
    return 'Description cannot exceed 1000 characters';
  }
  if (location !== undefined && location !== null && String(location).length > 200) {
    return 'Location cannot exceed 200 characters';
  }
  return null;
};

/**
 * validateHeadDoctor — optional head must be an existing doctor.
 * Returns { ok: true } or { ok: false, status, message }.
 */
const validateHeadDoctor = async (headDoctor) => {
  if (headDoctor === undefined || headDoctor === null || headDoctor === '') {
    return { ok: true, value: null };
  }
  if (!MONGO_ID_REGEX.test(headDoctor)) {
    return { ok: false, status: 400, message: 'headDoctor must be a valid doctor id' };
  }
  const doctor = await Doctor.findById(headDoctor);
  if (!doctor) {
    return { ok: false, status: 404, message: 'Head doctor not found' };
  }
  return { ok: true, value: doctor._id };
};

/** Map a mongoose error onto the standard error response. */
const handleKnownError = (res, error) => {
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return errorResponse(
      res,
      field === 'name'
        ? 'A department with this name already exists'
        : field === 'headDoctor'
          ? 'This doctor already heads a department'
          : `A department with this ${field} already exists`,
      409
    );
  }
  if (error && error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((e) => e.message);
    return errorResponse(res, messages.join('; '), 400, messages);
  }
  if (error && error.name === 'CastError') {
    return errorResponse(res, 'Invalid id format', 400);
  }
  return null;
};

// ──────────────────────────────────────────────
// GET /api/departments — list with search, filters, pagination
// ──────────────────────────────────────────────

const getDepartments = async (req, res, next) => {
  try {
    const { q, status, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { location: rx }];
    }
    if (status) {
      if (!Department.STATUSES.includes(status)) {
        return errorResponse(res, `Status must be one of: ${Department.STATUSES.join(', ')}`, 400);
      }
      filter.status = status;
    }

    // Whitelisted sort keys (default: newest first)
    const SORTS = {
      createdAt: { createdAt: 1 },
      '-createdAt': { createdAt: -1 },
      name: { name: 1 },
      '-name': { name: -1 },
    };
    const sortSpec = SORTS[sort] || SORTS['-createdAt'];

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('headDoctor', 'name doctorId specialization'),
      Department.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        departments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Departments fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/departments/:id — detail
// ──────────────────────────────────────────────

const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!MONGO_ID_REGEX.test(id || '')) {
      return errorResponse(res, 'Invalid department id', 400);
    }

    const department = await Department.findById(id).populate(
      'headDoctor',
      'name doctorId specialization email phone consultationFee'
    );
    if (!department) return errorResponse(res, 'Department not found', 404);

    return successResponse(res, department, 'Department fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/departments — create
// ──────────────────────────────────────────────

const createDepartment = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateFields(body);
    if (validationError) return errorResponse(res, validationError, 400);

    const head = await validateHeadDoctor(body.headDoctor);
    if (!head.ok) return errorResponse(res, head.message, head.status);

    const department = await Department.create({
      name: body.name.trim(),
      description: body.description || '',
      headDoctor: head.value,
      location: body.location || '',
      status: body.status || 'active',
    });

    return successResponse(res, department, 'Department created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/departments/:id — partial update
// ──────────────────────────────────────────────

const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!MONGO_ID_REGEX.test(id || '')) {
      return errorResponse(res, 'Invalid department id', 400);
    }

    const department = await Department.findById(id);
    if (!department) return errorResponse(res, 'Department not found', 404);

    const body = req.body || {};
    delete body._id; // immutable

    // Validate the merged shape (name uniqueness enforced by the index)
    const validationError = validateFields({
      name: body.name !== undefined ? body.name : department.name,
      status: body.status !== undefined ? body.status : department.status,
      description: body.description,
      location: body.location,
    });
    if (validationError) return errorResponse(res, validationError, 400);

    // headDoctor may be changed or cleared ("" / null → no head)
    if (body.headDoctor !== undefined) {
      const head = await validateHeadDoctor(body.headDoctor);
      if (!head.ok) return errorResponse(res, head.message, head.status);
      department.headDoctor = head.value;
    }

    const ALLOWED = ['name', 'description', 'location', 'status'];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) department[key] = body[key];
    }
    if (typeof department.name === 'string') department.name = department.name.trim();

    await department.save(); // full schema validation + unique index checks

    return successResponse(res, department, 'Department updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/departments/:id
// ──────────────────────────────────────────────

const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!MONGO_ID_REGEX.test(id || '')) {
      return errorResponse(res, 'Invalid department id', 400);
    }

    const department = await Department.findByIdAndDelete(id);
    if (!department) return errorResponse(res, 'Department not found', 404);

    return successResponse(res, { id: department._id, name: department.name }, 'Department deleted');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
