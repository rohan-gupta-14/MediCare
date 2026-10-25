/** 
 * prescription.controller.js — Prescription CRUD (Phase 21)
 * 
 * Endpoints (see routes/prescription.routes.js):
 *  - GET    /api/prescriptions       list — patient_id filter + pagination
 *  - GET    /api/prescriptions/:id   detail — accepts Mongo _id
 *  - POST   /api/prescriptions       create
 *  - PUT    /api/prescriptions/:id   update (partial)
 *  - DELETE /api/prescriptions/:id   remove
 * 
 * Authorization: protect + requirePermission('prescriptions', read|write)
 * (Phase 08 matrix: admin has full access; doctor/patient have read/write per matrix)
 */

const Prescription = require('../models/Prescription.model');
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
        ? 'A patient already has a prescription with this title'
        : `A prescription with this ${field} already exists`,
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
// GET /api/prescriptions — list with filters, pagination
// ──────────────────────────────────────────────

const getPrescriptions = async (req, res, next) => {
  try {
    const { q, status, patient, doctor, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: rx },
        { 'medication.name': rx },
      ];
    }
    if (status) {
      if (!Prescription.STATUSES.includes(status)) {
        return errorResponse(res, `Status must be one of: ${Prescription.STATUSES.join(', ')}`, 400);
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
      title: { title: 1 },
      '-title': { title: -1 },
    };
    const sortSpec = SORTS[sort] || SORTS['-createdAt'];

    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patient', 'name patientId email')
        .populate('doctor', 'name doctorId specialization'),
      Prescription.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        prescriptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Prescriptions fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/prescriptions/:id — detail
// ──────────────────────────────────────────────

const getPrescriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid prescription id', 400);
    }

    const prescription = await Prescription.findById(id)
      .populate('patient', 'name patientId email')
      .populate('doctor', 'name doctorId specialization');

    if (!prescription) return errorResponse(res, 'Prescription not found', 404);

    return successResponse(res, prescription, 'Prescription fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/prescriptions — create
// ──────────────────────────────────────────────

const createPrescription = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateFields({ patient: body.patient, doctor: body.doctor });
    if (validationError) return errorResponse(res, validationError, 400);

    // Check if patient already has an active prescription with same title
    const existing = await Prescription.findOne({
      patient: body.patient,
      title: body.title,
    });

    if (existing) {
      return errorResponse(
        res,
        'This patient already has a prescription with this title',
        409
      );
    }

    const prescription = await Prescription.create({
      patient: body.patient,
      doctor: body.doctor,
      department: body.department || null,
      appointment: body.appointment || null,
      title: body.title || '',
      description: body.description || '',
      instructions: body.instructions || '',
      status: body.status || 'active',
      startedDate: body.startedDate || null,
      endedDate: body.endedDate || null,
      refills: body.refills !== undefined ? body.refills : 0,
      medication: {
        name: body.medicationName || '',
        dosage: body.medicationDosage || '',
        frequency: body.medicationFrequency || '',
        duration: body.medicationDuration || '',
        strength: body.medicationStrength || '',
        form: body.medicationForm || 'tablet',
        notes: body.medicationNotes || '',
      },
      allergiesAlert: body.allergiesAlert || '',
    });

    return successResponse(res, prescription, 'Prescription created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/prescriptions/:id — partial update
// ──────────────────────────────────────────────

const updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid prescription id', 400);
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) return errorResponse(res, 'Prescription not found', 404);

    const body = req.body || {};
    delete body._id; // immutable

    // Validate merged shape
    const validationError = validateFields({
      patient: body.patient !== undefined ? body.patient : prescription.patient,
      doctor: body.doctor !== undefined ? body.doctor : prescription.doctor,
    });
    if (validationError) return errorResponse(res, validationError, 400);

    // Fields allowed for partial update
    const ALLOWED = [
      'title', 'description', 'instructions', 'status', 'startedDate', 'endedDate',
      'refills', 'medication', 'allergiesAlert'
    ];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        if (key === 'medication') {
          prescription.medication = { ...prescription.medication, ...body[key] };
        } else if (key === 'status') {
          if (!Prescription.STATUSES.includes(body.status)) {
            return errorResponse(
              res,
              `Status must be one of: ${Prescription.STATUSES.join(', ')}`,
              400
            );
          }
          prescription.status = body.status;
        } else {
          prescription[key] = body[key];
        }
      }
    }

    await prescription.save(); // full schema validation

    return successResponse(res, prescription, 'Prescription updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/prescriptions/:id
// ──────────────────────────────────────────────

const deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid prescription id', 400);
    }

    const prescription = await Prescription.findByIdAndDelete(id);
    if (!prescription) return errorResponse(res, 'Prescription not found', 404);

    return successResponse(res, { id: prescription._id }, 'Prescription deleted');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
};