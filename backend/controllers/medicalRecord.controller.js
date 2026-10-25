/** 
 * medicalRecord.controller.js — Medical record CRUD (Phase 18)
 * 
 * Endpoints (see routes/medicalRecord.routes.js):
 *  - GET    /api/medical-records       list — patient_id filter + pagination
 *  - GET    /api/medical-records/:id   detail — accepts Mongo _id
 *  - POST   /api/medical-records       create
 *  - PUT    /api/medical-records/:id   update (partial)
 *  - DELETE /api/medical-records/:id   remove
 * 
 * Authorization: protect + requirePermission('medicalRecords', read|write)
 * (Phase 08 matrix: admin has full access; doctor/patient have read access;
 *  receptionist has read/write per the matrix)
 */

const MedicalRecord = require('../models/MedicalRecord.model');
const User = require('../models/User.model');
const Doctor = require('../models/Doctor.model');
const Department = require('../models/Department.model');
const Admission = require('../models/Admission.model');
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
        ? 'A patient already has a medical record with this title'
        : `A medical record with this ${field} already exists`,
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
// GET /api/medical-records — list with filters, pagination
// ──────────────────────────────────────────────

const getMedicalRecords = async (req, res, next) => {
  try {
    const { q, status, patient, doctor, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: rx },
        { chiefComplaint: rx },
        { description: rx },
      ];
    }
    if (status) {
      if (!MedicalRecord.STATUSES.includes(status)) {
        return errorResponse(res, `Status must be one of: ${MedicalRecord.STATUSES.join(', ')}`, 400);
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

    const [records, total] = await Promise.all([
      MedicalRecord.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patient', 'name patientId email')
        .populate('doctor', 'name doctorId specialization'),
      MedicalRecord.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Medical records fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/medical-records/:id — detail
// ──────────────────────────────────────────────

const getMedicalRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid medical record id', 400);
    }

    const record = await MedicalRecord.findById(id)
      .populate('patient', 'name patientId email')
      .populate('doctor', 'name doctorId specialization');

    if (!record) return errorResponse(res, 'Medical record not found', 404);

    return successResponse(res, record, 'Medical record fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/medical-records — create
// ──────────────────────────────────────────────

const createMedicalRecord = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateFields({ patient: body.patient, doctor: body.doctor });
    if (validationError) return errorResponse(res, validationError, 400);

    // Check if patient already has an active medical record with same title
    const existing = await MedicalRecord.findOne({
      patient: body.patient,
      title: body.title,
    });

    if (existing) {
      return errorResponse(
        res,
        'This patient already has a medical record with this title',
        409
      );
    }

    const record = await MedicalRecord.create({
      patient: body.patient,
      doctor: body.doctor,
      department: body.department || null,
      admission: body.admission || null,
      title: body.title || '',
      description: body.description || '',
      chiefComplaint: body.chiefComplaint || '',
      diagnosis: body.diagnosis || '',
      prescriptionSummary: body.prescriptionSummary || '',
      notes: body.notes || '',
      status: body.status || 'active',
      vitals: body.vitals || {},
      height: body.height || {},
      weight: body.weight || {},
      allergies: body.allergies || [],
      medications: body.medications || [],
      labOrders: body.labOrders || [],
    });

    return successResponse(res, record, 'Medical record created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/medical-records/:id — partial update
// ──────────────────────────────────────────────

const updateMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid medical record id', 400);
    }

    const record = await MedicalRecord.findById(id);
    if (!record) return errorResponse(res, 'Medical record not found', 404);

    const body = req.body || {};
    delete body._id; // immutable

    // Validate merged shape
    const validationError = validateFields({
      patient: body.patient !== undefined ? body.patient : record.patient,
      doctor: body.doctor !== undefined ? body.doctor : record.doctor,
    });
    if (validationError) return errorResponse(res, validationError, 400);

    // Fields allowed for partial update
    const ALLOWED = ['title', 'description', 'chiefComplaint', 'diagnosis', 'prescriptionSummary', 'notes', 'status', 'vitals', 'height', 'weight', 'allergies', 'medications', 'labOrders'];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        record[key] = body[key];
      }
    }

    await record.save(); // full schema validation

    return successResponse(res, record, 'Medical record updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/medical-records/:id
// ──────────────────────────────────────────────

const deleteMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return errorResponse(res, 'Invalid medical record id', 400);
    }

    const record = await MedicalRecord.findByIdAndDelete(id);
    if (!record) return errorResponse(res, 'Medical record not found', 404);

    return successResponse(res, { id: record._id }, 'Medical record deleted');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
};