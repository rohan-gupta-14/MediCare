/** 
 * admission.controller.js — Admission CRUD (Phase 17)
 * 
 * Endpoints (see routes/admission.routes.js):
 *  - GET    /api/admissions       list — patient_id filter + status filter + pagination
 *  - GET    /api/admissions/:id   detail — accepts Mongo _id
 *  - POST   /api/admissions       create
 *  - PUT    /api/admissions/:id   update (partial)
 *  - DELETE /api/admissions/:id   remove
 * 
 * Authorization: protect + requirePermission('admissions', read|write)
 * (Phase 08 matrix: admin has full access; doctor/read/receptionist have read/write)
 */

const Admission = require('../models/Admission.model');
const User = require('../models/User.model');
const Doctor = require('../models/Doctor.model');
const Department = require('../models/Department.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const isValidObjectId = (val) => /^[0-9a-fA-F]{24}$/.test(val);

/** Validate required fields for create/update. */
const validateFields = ({ patient, doctor, status, admissionDate }) => {
  if (!patient || !isValidObjectId(patient)) {
    return 'Patient must be a valid user id';
  }
  if (!doctor || !isValidObjectId(doctor)) {
    return 'Doctor must be a valid doctor id';
  }
  if (status !== undefined && status !== '' && !Admission.STATUSES.includes(status)) {
    return `Status must be one of: ${Admission.STATUSES.join(', ')}`;
  }
  if (admissionDate) {
    const adDate = new Date(admissionDate);
    if (isNaN(adDate)) {
      return 'Invalid admission date format';
    }
    if (adDate < new Date()) {
      return 'Admission date cannot be in the past';
    }
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
        ? 'A patient already has an active admission'
        : field === 'doctor'
          ? 'This doctor already has an active admission'
          : `A admission with this ${field} already exists`,
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
  if (error && error.message && error.message.includes('Admission date cannot be in the past')) {
    return errorResponse(res, error.message, 400);
  }
  return null;
};

// ──────────────────────────────────────────────
// GET /api/admissions — list with filters, pagination
// ──────────────────────────────────────────────

const getAdmissions = async (req, res, next) => {
  try {
    const { q, status, patient, doctor, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { _id: rx }, // search by id
        // Note: patient name/doctor name would require populate; kept simple per Phase 15 pattern
      ];
    }
    if (status) {
      if (!Admission.STATUSES.includes(status)) {
        return errorResponse(res, `Status must be one of: ${Admission.STATUSES.join(', ')}`, 400);
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
      admissionDate: { admissionDate: 1 },
      '-admissionDate': { admissionDate: -1 },
    };
    const sortSpec = SORTS[sort] || SORTS['-createdAt'];

    const [admissions, total] = await Promise.all([
      Admission.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patient', 'name patientId email')
        .populate('doctor', 'name doctorId specialization')
        .populate('department', 'name'),
      Admission.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        admissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Admissions fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/admissions/:id — detail
// ──────────────────────────────────────────────

const getAdmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid admission id', 400);
    }

    const admission = await Admission.findById(id)
      .populate('patient', 'name patientId email')
      .populate('doctor', 'name doctorId specialization')
      .populate('department', 'name');

    if (!admission) return errorResponse(res, 'Admission not found', 404);

    return successResponse(res, admission, 'Admission fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/admissions — create
// ──────────────────────────────────────────────

const createAdmission = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateFields(body);
    if (validationError) return errorResponse(res, validationError, 400);

    // Check if patient already has an active admission (same status 'pending' or 'admitted')
    const existing = await Admission.findOne({
      patient: body.patient,
      status: { $in: ['pending', 'admitted'] },
    });

    if (existing) {
      return errorResponse(
        res,
        'This patient already has an active admission (pending or admitted status)',
        409
      );
    }

    const admission = await Admission.create({
      patient: body.patient,
      doctor: body.doctor,
      department: body.department || null,
      admissionDate: new Date(body.admissionDate),
      dischargeDate: body.dischargeDate ? new Date(body.dischargeDate) : null,
      reason: body.reason || '',
      status: body.status || 'pending',
      roomNumber: body.roomNumber || '',
      bedNumber: body.bedNumber || '',
      notes: body.notes || '',
    });

    return successResponse(res, admission, 'Admission created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/admissions/:id — partial update
// ──────────────────────────────────────────────

const updateAdmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid admission id', 400);
    }

    const admission = await Admission.findById(id);
    if (!admission) return errorResponse(res, 'Admission not found', 404);

    const body = req.body || {};
    delete body._id; // immutable

    // Validate merged shape
    const validationError = validateFields({
      patient: body.patient !== undefined ? body.patient : admission.patient,
      doctor: body.doctor !== undefined ? body.doctor : admission.doctor,
      status: body.status !== undefined ? body.status : admission.status,
      admissionDate:
        body.admissionDate !== undefined ? body.admissionDate : String(admission.admissionDate),
    });
    if (validationError) return errorResponse(res, validationError, 400);

    // Fields allowed for partial update
    const ALLOWED = ['status', 'dischargeDate', 'roomNumber', 'bedNumber', 'notes'];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        if (key === 'dischargeDate' && body.dischargeDate) {
          admission[key] = new Date(body.dischargeDate);
          // Validate dischargeDate >= admissionDate
          const admDate = new Date(admission.admissionDate);
          const disDate = new Date(body.dischargeDate);
          if (disDate < admDate) {
            return errorResponse(
              res,
              'Discharge date must be after admission date',
              400
            );
          }
        } else if (key === 'status') {
          if (!Admission.STATUSES.includes(body.status)) {
            return errorResponse(
              res,
              `Status must be one of: ${Admission.STATUSES.join(', ')}`,
              400
            );
          }
          admission.status = body.status;
        } else {
          admission[key] = body[key];
        }
      }
    }

    await admission.save(); // full schema validation

    return successResponse(res, admission, 'Admission updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/admissions/:id
// ──────────────────────────────────────────────

const deleteAdmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid admission id', 400);
    }

    const admission = await Admission.findByIdAndDelete(id);
    if (!admission) return errorResponse(res, 'Admission not found', 404);

    return successResponse(res, { id: admission._id, status: admission.status }, 'Admission deleted');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
};