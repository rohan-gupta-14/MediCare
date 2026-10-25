/** 
 * labTest.controller.js — Lab test CRUD (Phase 22)
 * 
 * Endpoints (see routes/labTest.routes.js):
 *  - GET    /api/lab-tests       list — patient_id filter + pagination
 *  - GET    /api/lab-tests/:id   detail — accepts Mongo _id
 *  - POST   /api/lab-tests       create
 *  - PUT    /api/lab-tests/:id   update (partial)
 *  - DELETE /api/lab-tests/:id   remove
 * 
 * Authorization: protect + requirePermission('labTests', read|write)
 * (Phase 08 matrix: admin has full access; doctor/patient have read/write per matrix)
 */

const LabTest = require('../models/LabTest.model');
const User = require('../models/User.model');
const Doctor = require('../models/Doctor.model');
const Department = require('../models/Department.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const isValidObjectId = (val) => /^[0-9a-fA-F]{24}$/.test(val);

/** Validate required fields for create/update. */
const validateFields = ({ patient, doctor }) => {
  if (!patient || !isValidObjectId(patient)) {
    return 'Patient must be a valid user id';
  }
  if (!doctor || !isValidObjectId(doctor)) {
    return 'Doctor must be a valid doctor id';
  }
  return null;
};

/** Map mongoose error onto standard error response. */
const handleKnownError = (res, error) => {
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return errorResponse(
      res,
      field === 'patient'
        ? 'A patient already has a lab test with this test name'
        : `A lab test with this ${field} already exists`,
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
// GET /api/lab-tests — list with filters, pagination
// ──────────────────────────────────────────────

const getLabTests = async (req, res, next) => {
  try {
    const { q, status, patient, doctor, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { testName: rx },
        { testType: rx },
      ];
    }
    if (status) {
      if (!LabTest.STATUSES.includes(status)) {
        return errorResponse(res, `Status must be one of: ${LabTest.STATUSES.join(', ')}`, 400);
      }
      filter.status = status;
    }
    if (patient && isValidObjectId(patient)) {
      filter.patient = patient;
    }
    if (doctor && isValidObjectId(doctor)) {
      filter.doctor = doctor;
    }

    // Whitelisted sort keys (default: newest first)
    const SORTS = {
      createdAt: { createdAt: 1 },
      '-createdAt': { createdAt: -1 },
      testName: { testName: 1 },
      '-testName': { testName: -1 },
    };
    const sortSpec = SORTS[sort] || SORTS['-createdAt'];

    const [labTests, total] = await Promise.all([
      LabTest.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patient', 'name patientId email')
        .populate('doctor', 'name doctorId specialization'),
      LabTest.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        labTests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Lab tests fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/lab-tests/:id — detail
// ──────────────────────────────────────────────

const getLabTestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid lab test id', 400);
    }

    const labTest = await LabTest.findById(id)
      .populate('patient', 'name patientId email')
      .populate('doctor', 'name doctorId specialization');

    if (!labTest) return errorResponse(res, 'Lab test not found', 404);

    return successResponse(res, labTest, 'Lab test fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/lab-tests — create
// ──────────────────────────────────────────────

const createLabTest = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateFields({ patient: body.patient, doctor: body.doctor });
    if (validationError) return errorResponse(res, validationError, 400);

    // Check if patient already has an active lab test with same test name
    const existing = await LabTest.findOne({
      patient: body.patient,
      testName: body.testName,
    });

    if (existing) {
      return errorResponse(
        res,
        'This patient already has a lab test with this test name',
        409
      );
    }

    const labTest = await LabTest.create({
      patient: body.patient,
      doctor: body.doctor,
      department: body.department || null,
      testType: body.testType || '',
      testName: body.testName || '',
      orderedDate: new Date(body.orderedDate),
      status: body.status || 'pending',
      results: body.results || '',
      referenceRange: body.referenceRange || '',
      unit: body.unit || '',
      resultValue: body.resultValue || '',
      notes: body.notes || '',
    });

    return successResponse(res, labTest, 'Lab test created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/lab-tests/:id — partial update
// ──────────────────────────────────────────────

const updateLabTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid lab test id', 400);
    }

    const labTest = await LabTest.findById(id);
    if (!labTest) return errorResponse(res, 'Lab test not found', 404);

    const body = req.body || {};
    delete body._id; // immutable

    // Validate merged shape
    const validationError = validateFields({
      patient: body.patient !== undefined ? body.patient : labTest.patient,
      doctor: body.doctor !== undefined ? body.doctor : labTest.doctor,
    });
    if (validationError) return errorResponse(res, validationError, 400);

    // Fields allowed for partial update
    const ALLOWED = ['testType', 'testName', 'orderedDate', 'status', 'results', 'referenceRange', 'unit', 'resultValue', 'notes'];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        if (key === 'status') {
          if (!LabTest.STATUSES.includes(body.status)) {
            return errorResponse(
              res,
              `Status must be one of: ${LabTest.STATUSES.join(', ')}`,
              400
            );
          }
          labTest.status = body.status;
        } else {
          labTest[key] = body[key];
        }
      }
    }

    await labTest.save(); // full schema validation

    return successResponse(res, labTest, 'Lab test updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/lab-tests/:id
// ──────────────────────────────────────────────

const deleteLabTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid lab test id', 400);
    }

    const labTest = await LabTest.findByIdAndDelete(id);
    if (!labTest) return errorResponse(res, 'Lab test not found', 404);

    return successResponse(res, { id: labTest._id }, 'Lab test deleted');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest,
};