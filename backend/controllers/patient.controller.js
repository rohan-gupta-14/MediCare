/**
 * patient.controller.js — Patient CRUD (Phase 11)
 *
 * Endpoints (see routes/patient.routes.js):
 *  - GET    /api/patients       list — search + filters + pagination
 *  - GET    /api/patients/:id   detail — accepts Mongo _id OR patientId (PAT-0001)
 *  - POST   /api/patients       create (patientId auto-generated)
 *  - PUT    /api/patients/:id   update (partial)
 *  - DELETE /api/patients/:id   remove
 *
 * Authorization:
 *  - Module-level: protect + requirePermission('patients', read|write) (Phase 08)
 *  - Row-level: the 'patient' role only ever sees rows whose `user` is
 *    themselves (scopeFilter) — module grants are checked in the middleware,
 *    ownership here, per config/permissions.js.
 */

const Patient = require('../models/Patient.model');
const User = require('../models/User.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const PATIENT_ID_REGEX = /^PAT-\d{4,}$/;

/** Escape user input before building a RegExp (prevents ReDoS/injection). */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * scopeFilter — Row-level scoping for the current user.
 * admin/doctor/receptionist read every patient; the 'patient' role would
 * only ever match their own linked record.
 */
const scopeFilter = (req) =>
  req.user.role === 'patient' ? { user: req.user._id } : {};

/**
 * resolveWhere — Turn :id into a Mongo filter.
 * Accepts a 24-hex ObjectId or a human patientId (PAT-0001).
 * Returns null when the parameter cannot be an id at all.
 */
const resolveWhere = (param) => {
  if (MONGO_ID_REGEX.test(param)) return { _id: param };
  if (PATIENT_ID_REGEX.test(param.toUpperCase())) return { patientId: param.toUpperCase() };
  return null;
};

/** Manual validation for create — returns an error message or null. */
const validateCreate = (body) => {
  const { name, email, gender, phone, bloodGroup, dateOfBirth, user, allergies } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Name is required (min 2 characters)';
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'A valid email is required';
  }
  if (!gender || !Patient.GENDERS.includes(gender)) {
    return `Gender must be one of: ${Patient.GENDERS.join(', ')}`;
  }
  if (phone !== undefined && phone !== '' && !PHONE_REGEX.test(phone)) {
    return 'Please provide a valid phone number';
  }
  if (
    bloodGroup !== undefined &&
    bloodGroup !== '' &&
    !Patient.BLOOD_GROUPS.includes(bloodGroup)
  ) {
    return `Blood group must be one of: ${Patient.BLOOD_GROUPS.join(', ')}`;
  }
  if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== '') {
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return 'dateOfBirth must be a valid date';
    if (dob > new Date()) return 'Date of birth cannot be in the future';
  }
  if (user !== undefined && user !== null && user !== '') {
    if (!MONGO_ID_REGEX.test(user)) return 'user must be a valid user id';
  }
  if (allergies !== undefined) {
    if (!Array.isArray(allergies) || allergies.some((a) => typeof a !== 'string' || !a.trim())) {
      return 'allergies must be an array of non-empty strings';
    }
  }
  if (body.medicalHistory !== undefined && !Array.isArray(body.medicalHistory)) {
    return 'medicalHistory must be an array';
  }
  return null;
};

/** Map a mongoose error onto the standard error response. */
const handleKnownError = (res, error) => {
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return errorResponse(
      res,
      field === 'email'
        ? 'A patient with this email already exists'
        : `A patient with this ${field} already exists`,
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
// GET /api/patients — list with search, filters, pagination
// ──────────────────────────────────────────────

const getPatients = async (req, res, next) => {
  try {
    const { q, gender, bloodGroup, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = scopeFilter(req);

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { patientId: rx }, { phone: rx }];
    }
    if (gender) {
      if (!Patient.GENDERS.includes(gender)) {
        return errorResponse(res, `Gender must be one of: ${Patient.GENDERS.join(', ')}`, 400);
      }
      filter.gender = gender;
    }
    if (bloodGroup) {
      if (!Patient.BLOOD_GROUPS.includes(bloodGroup)) {
        return errorResponse(
          res,
          `Blood group must be one of: ${Patient.BLOOD_GROUPS.join(', ')}`,
          400
        );
      }
      filter.bloodGroup = bloodGroup;
    }

    // Whitelisted sort keys (default: newest first)
    const SORTS = {
      createdAt: { createdAt: 1 },
      '-createdAt': { createdAt: -1 },
      name: { name: 1 },
      '-name': { name: -1 },
      dateOfBirth: { dateOfBirth: 1 },
      '-dateOfBirth': { dateOfBirth: -1 },
    };
    const sortSpec = SORTS[sort] || SORTS['-createdAt'];

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email role profileImage'),
      Patient.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        patients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Patients fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/patients/:id — detail (_id or PAT-0001)
// ──────────────────────────────────────────────

const getPatientById = async (req, res, next) => {
  try {
    const where = resolveWhere(req.params.id);
    if (!where) {
      return errorResponse(res, 'Invalid patient id — use the ObjectId or PAT-0001', 400);
    }

    const patient = await Patient.findOne({ ...where, ...scopeFilter(req) }).populate(
      'user',
      'name email role profileImage'
    );
    if (!patient) return errorResponse(res, 'Patient not found', 404);

    return successResponse(res, patient, 'Patient fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/patients — create
// ──────────────────────────────────────────────

const createPatient = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateCreate(body);
    if (validationError) return errorResponse(res, validationError, 400);

    // Optional linked account must exist and belong to a patient role
    if (body.user) {
      const linked = await User.findById(body.user);
      if (!linked) return errorResponse(res, 'Linked user not found', 404);
      if (linked.role !== 'patient') {
        return errorResponse(res, 'Linked user must have the patient role', 400);
      }
    }

    const patient = await Patient.create({
      user: body.user || null,
      // patientId: auto-generated in the model's pre('validate') hook
      patientId: body.patientId,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone || '',
      gender: body.gender,
      dateOfBirth: body.dateOfBirth || null,
      bloodGroup: body.bloodGroup || '',
      address: body.address || '',
      emergencyContact: body.emergencyContact || {},
      profileImage: body.profileImage || '',
      medicalHistory: body.medicalHistory || [],
      allergies: body.allergies || [],
    });

    return successResponse(res, patient, 'Patient created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/patients/:id — partial update
// ──────────────────────────────────────────────

const updatePatient = async (req, res, next) => {
  try {
    const where = resolveWhere(req.params.id || '');
    if (!where) {
      return errorResponse(res, 'Invalid patient id — use the ObjectId or PAT-0001', 400);
    }

    const patient = await Patient.findOne({ ...where, ...scopeFilter(req) });
    if (!patient) return errorResponse(res, 'Patient not found', 404);

    const body = req.body || {};
    // Immutable / server-managed fields
    delete body._id;
    delete body.patientId;
    delete body.user; // relinking is a dedicated flow (Phase 35), not a blind PUT

    // Validate the incoming shape before applying (email stays unique via index)
    const validationError = validateCreate({
      name: body.name !== undefined ? body.name : patient.name,
      email: body.email !== undefined ? body.email : patient.email,
      gender: body.gender !== undefined ? body.gender : patient.gender,
      phone: body.phone,
      bloodGroup: body.bloodGroup,
      dateOfBirth: body.dateOfBirth,
      allergies: body.allergies,
      medicalHistory: body.medicalHistory,
    });
    if (validationError) return errorResponse(res, validationError, 400);

    const ALLOWED = [
      'name',
      'email',
      'phone',
      'gender',
      'dateOfBirth',
      'bloodGroup',
      'address',
      'emergencyContact',
      'profileImage',
      'medicalHistory',
      'allergies',
    ];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) patient[key] = body[key];
    }
    if (typeof patient.email === 'string') patient.email = patient.email.trim().toLowerCase();

    await patient.save(); // full schema validation + unique index checks

    return successResponse(res, patient, 'Patient updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/patients/:id
// ──────────────────────────────────────────────

const deletePatient = async (req, res, next) => {
  try {
    const where = resolveWhere(req.params.id || '');
    if (!where) {
      return errorResponse(res, 'Invalid patient id — use the ObjectId or PAT-0001', 400);
    }

    const patient = await Patient.findOneAndDelete({ ...where, ...scopeFilter(req) });
    if (!patient) return errorResponse(res, 'Patient not found', 404);

    return successResponse(res, { id: patient._id, patientId: patient.patientId }, 'Patient deleted');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
