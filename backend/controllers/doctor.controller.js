/**
 * doctor.controller.js — Doctor CRUD (Phase 13)
 *
 * Endpoints (see routes/doctor.routes.js):
 *  - GET    /api/doctors       list — search + filters + pagination
 *  - GET    /api/doctors/:id   detail — accepts Mongo _id OR doctorId (DOC-0001)
 *  - POST   /api/doctors       create (doctorId auto-generated)
 *  - PUT    /api/doctors/:id   update (partial)
 *  - DELETE /api/doctors/:id   remove
 *
 * Authorization: protect + requirePermission('doctors', read|write) (Phase 08).
 * The matrix grants `doctors:*` to admin only — no row-level scoping needed
 * (unlike patients, this is a staff registry, not a patient's own record).
 */

const Doctor = require('../models/Doctor.model');
const User = require('../models/User.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DOCTOR_ID_REGEX = /^DOC-\d{4,}$/;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * resolveWhere — Turn :id into a Mongo filter.
 * Accepts a 24-hex ObjectId or a human doctorId (DOC-0001).
 * Returns null when the parameter cannot be an id at all.
 */
const resolveWhere = (param) => {
  if (MONGO_ID_REGEX.test(param)) return { _id: param };
  if (DOCTOR_ID_REGEX.test(param.toUpperCase())) return { doctorId: param.toUpperCase() };
  return null;
};

/** Validate the availability array — returns an error message or null. */
const validateAvailability = (availability) => {
  if (!Array.isArray(availability)) return 'availability must be an array';
  const seen = new Set();
  for (const slot of availability) {
    if (!slot || typeof slot !== 'object') return 'each availability slot must be an object';
    const { day, startTime, endTime } = slot;
    if (!Doctor.DAYS.includes(day)) {
      return `Availability day must be one of: ${Doctor.DAYS.join(', ')}`;
    }
    if (seen.has(day)) return `Availability contains duplicate day "${day}"`;
    seen.add(day);
    if (typeof startTime !== 'string' || !TIME_REGEX.test(startTime)) {
      return 'Availability startTime must look like HH:MM (24h)';
    }
    if (typeof endTime !== 'string' || !TIME_REGEX.test(endTime)) {
      return 'Availability endTime must look like HH:MM (24h)';
    }
    if (endTime <= startTime) return `Availability on ${day}: endTime must be after startTime`;
    if (slot.isAvailable !== undefined && typeof slot.isAvailable !== 'boolean') {
      return 'Availability isAvailable must be a boolean';
    }
  }
  return null;
};

/** Manual validation for create — returns an error message or null. */
const validateCreate = (body) => {
  const {
    name,
    email,
    specialization,
    department,
    qualification,
    experience,
    phone,
    consultationFee,
    availability,
    bio,
    user,
  } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Name is required (min 2 characters)';
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'A valid email is required';
  }
  if (!specialization || !Doctor.SPECIALIZATIONS.includes(specialization)) {
    return `Specialization must be one of: ${Doctor.SPECIALIZATIONS.join(', ')}`;
  }
  if (
    consultationFee === undefined ||
    consultationFee === null ||
    typeof consultationFee !== 'number' ||
    Number.isNaN(consultationFee) ||
    consultationFee < 0
  ) {
    return 'Consultation fee is required and must be a number ≥ 0';
  }
  if (experience !== undefined && experience !== null) {
    if (typeof experience !== 'number' || experience < 0 || experience > 70) {
      return 'Experience must be a number between 0 and 70 (years)';
    }
  }
  if (phone !== undefined && phone !== '' && !PHONE_REGEX.test(phone)) {
    return 'Please provide a valid phone number';
  }
  if (department !== undefined && department !== '' && String(department).length > 100) {
    return 'Department cannot exceed 100 characters';
  }
  if (qualification !== undefined && qualification !== '' && String(qualification).length > 200) {
    return 'Qualification cannot exceed 200 characters';
  }
  if (bio !== undefined && bio !== '' && String(bio).length > 1000) {
    return 'Bio cannot exceed 1000 characters';
  }
  if (availability !== undefined) {
    const availabilityError = validateAvailability(availability);
    if (availabilityError) return availabilityError;
  }
  if (user !== undefined && user !== null && user !== '' && !MONGO_ID_REGEX.test(user)) {
    return 'user must be a valid user id';
  }
  return null;
};

/** Map a mongoose error onto the standard error response. */
const handleKnownError = (res, error) => {
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    if (field === 'email') {
      return errorResponse(res, 'A doctor with this email already exists', 409);
    }
    if (field === 'doctorId') {
      return errorResponse(res, 'A doctor with this doctorId already exists', 409);
    }
    if (field === 'user') {
      return errorResponse(res, 'This user already has a doctor profile', 409);
    }
    return errorResponse(res, `A doctor with this ${field} already exists`, 409);
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
// GET /api/doctors — list with search, filters, pagination
// ──────────────────────────────────────────────

const getDoctors = async (req, res, next) => {
  try {
    const { q, specialization, department, sort } = req.query || {};

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};

    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [
        { name: rx },
        { email: rx },
        { doctorId: rx },
        { specialization: rx },
        { department: rx },
        { phone: rx },
      ];
    }
    if (specialization) {
      if (!Doctor.SPECIALIZATIONS.includes(specialization)) {
        return errorResponse(
          res,
          `Specialization must be one of: ${Doctor.SPECIALIZATIONS.join(', ')}`,
          400
        );
      }
      filter.specialization = specialization;
    }
    if (department && typeof department === 'string' && department.trim()) {
      filter.department = new RegExp(`^${escapeRegex(department.trim())}$`, 'i');
    }

    // Whitelisted sort keys (default: newest first)
    const SORTS = {
      createdAt: { createdAt: 1 },
      '-createdAt': { createdAt: -1 },
      name: { name: 1 },
      '-name': { name: -1 },
      experience: { experience: 1 },
      '-experience': { experience: -1 },
      consultationFee: { consultationFee: 1 },
      '-consultationFee': { consultationFee: -1 },
    };
    const sortSpec = SORTS[sort] || SORTS['-createdAt'];

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email role profileImage'),
      Doctor.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        doctors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      'Doctors fetched'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/doctors/:id — detail (_id or DOC-0001)
// ──────────────────────────────────────────────

const getDoctorById = async (req, res, next) => {
  try {
    const where = resolveWhere(req.params.id);
    if (!where) {
      return errorResponse(res, 'Invalid doctor id — use the ObjectId or DOC-0001', 400);
    }

    const doctor = await Doctor.findOne(where).populate(
      'user',
      'name email role profileImage'
    );
    if (!doctor) return errorResponse(res, 'Doctor not found', 404);

    return successResponse(res, doctor, 'Doctor fetched');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/doctors — create
// ──────────────────────────────────────────────

const createDoctor = async (req, res, next) => {
  try {
    const body = req.body || {};

    const validationError = validateCreate(body);
    if (validationError) return errorResponse(res, validationError, 400);

    // Optional linked account must exist and belong to the doctor role
    if (body.user) {
      const linked = await User.findById(body.user);
      if (!linked) return errorResponse(res, 'Linked user not found', 404);
      if (linked.role !== 'doctor') {
        return errorResponse(res, 'Linked user must have the doctor role', 400);
      }
    }

    const doctor = await Doctor.create({
      user: body.user || null,
      // doctorId: auto-generated in the model's pre('validate') hook
      doctorId: body.doctorId,
      name: body.name.trim(),
      specialization: body.specialization,
      department: body.department || '',
      qualification: body.qualification || '',
      experience: body.experience || 0,
      phone: body.phone || '',
      email: body.email.trim().toLowerCase(),
      consultationFee: body.consultationFee,
      availability: body.availability || [],
      profileImage: body.profileImage || '',
      bio: body.bio || '',
    });

    return successResponse(res, doctor, 'Doctor created', 201);
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// PUT /api/doctors/:id — partial update
// ──────────────────────────────────────────────

const updateDoctor = async (req, res, next) => {
  try {
    const where = resolveWhere(req.params.id || '');
    if (!where) {
      return errorResponse(res, 'Invalid doctor id — use the ObjectId or DOC-0001', 400);
    }

    const doctor = await Doctor.findOne(where);
    if (!doctor) return errorResponse(res, 'Doctor not found', 404);

    const body = req.body || {};
    // Immutable / server-managed fields
    delete body._id;
    delete body.doctorId;
    delete body.user; // relinking is a dedicated flow, not a blind PUT

    // Validate the incoming shape before applying (email stays unique via index)
    const validationError = validateCreate({
      name: body.name !== undefined ? body.name : doctor.name,
      email: body.email !== undefined ? body.email : doctor.email,
      specialization:
        body.specialization !== undefined ? body.specialization : doctor.specialization,
      department: body.department,
      qualification: body.qualification,
      experience: body.experience,
      phone: body.phone,
      consultationFee:
        body.consultationFee !== undefined ? body.consultationFee : doctor.consultationFee,
      availability: body.availability,
      bio: body.bio,
    });
    if (validationError) return errorResponse(res, validationError, 400);

    const ALLOWED = [
      'name',
      'specialization',
      'department',
      'qualification',
      'experience',
      'phone',
      'email',
      'consultationFee',
      'availability',
      'profileImage',
      'bio',
    ];
    for (const key of ALLOWED) {
      if (body[key] !== undefined) doctor[key] = body[key];
    }
    if (typeof doctor.email === 'string') doctor.email = doctor.email.trim().toLowerCase();

    await doctor.save(); // full schema validation + unique index checks

    return successResponse(res, doctor, 'Doctor updated');
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

// ──────────────────────────────────────────────
// DELETE /api/doctors/:id
// ──────────────────────────────────────────────

const deleteDoctor = async (req, res, next) => {
  try {
    const where = resolveWhere(req.params.id || '');
    if (!where) {
      return errorResponse(res, 'Invalid doctor id — use the ObjectId or DOC-0001', 400);
    }

    const doctor = await Doctor.findOneAndDelete(where);
    if (!doctor) return errorResponse(res, 'Doctor not found', 404);

    return successResponse(
      res,
      { id: doctor._id, doctorId: doctor.doctorId },
      'Doctor deleted'
    );
  } catch (error) {
    const known = handleKnownError(res, error);
    if (known) return known;
    return next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};
