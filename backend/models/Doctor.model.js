/**
 * Doctor.model.js — Doctor staff profile (Phase 13)
 *
 * Responsibilities:
 *  - Store the professional profile for a doctor, optionally linked to a
 *    User account (`user`, role 'doctor' — checked in the controller)
 *  - Auto-generate a unique, human-friendly doctorId (DOC-0001) from an
 *    atomic counter so concurrent creates never collide (same technique
 *    as Patient.model.js)
 *  - Weekly availability schedule (day + time window) consumed by the
 *    appointment booking flow in Phase 16+
 *
 * `department` is a free-text field for now — it becomes a ref to the
 * Department model once Phase 15 lands.
 *
 * RBAC note: the Phase 08 matrix grants `doctors:*` only to admin, so the
 * controller enforces admin-only access; there is no row-level scoping.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'ENT',
  'General Medicine',
  'Gynecology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Surgery',
  'Urology',
];

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;
const DOCTOR_ID_REGEX = /^DOC-\d{4,}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // 24h HH:MM

// ──────────────────────────────────────────────
// Sub-schemas
// ──────────────────────────────────────────────

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: { values: DAYS, message: 'Day must be one of: {VALUES}' },
      required: [true, 'Day is required for an availability slot'],
    },
    startTime: {
      type: String,
      required: [true, 'startTime is required (HH:MM)'],
      match: [TIME_REGEX, 'startTime must look like HH:MM (24h)'],
    },
    endTime: {
      type: String,
      required: [true, 'endTime is required (HH:MM)'],
      match: [TIME_REGEX, 'endTime must look like HH:MM (24h)'],
    },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const doctorSchema = new mongoose.Schema(
  {
    user: {
      // Linked account (role 'doctor') — optional: a profile can exist
      // before the login credentials are issued (Phase 15 staff flow).
      // One account may hold at most one doctor profile.
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    doctorId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      match: [DOCTOR_ID_REGEX, 'doctorId must look like DOC-0001'],
      // Generated in pre('validate') when not supplied explicitly
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    specialization: {
      type: String,
      enum: {
        values: SPECIALIZATIONS,
        message: 'Specialization must be one of: {VALUES}',
      },
      required: [true, 'Specialization is required'],
    },
    department: {
      // Free text until the Department model (Phase 15) becomes a ref
      type: String,
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
      default: '',
    },
    qualification: {
      // e.g. "MBBS, MD (General Medicine)"
      type: String,
      trim: true,
      maxlength: [200, 'Qualification cannot exceed 200 characters'],
      default: '',
    },
    experience: {
      // years
      type: Number,
      min: [0, 'Experience cannot be negative'],
      max: [70, 'Experience cannot exceed 70 years'],
      default: 0,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [PHONE_REGEX, 'Please provide a valid phone number'],
      // empty string / undefined is allowed (match is skipped for '')
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    consultationFee: {
      // INR — required because appointments (Phase 16) and billing
      // (Phase 33) quote this figure
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Consultation fee cannot be negative'],
    },
    availability: {
      type: [availabilitySlotSchema],
      default: [],
      validate: {
        validator: (slots) => {
          const days = slots.map((s) => s.day);
          return new Set(days).size === days.length; // no duplicate days
        },
        message: 'Availability must not contain duplicate days',
      },
    },
    profileImage: {
      type: String,
      trim: true,
      default: '', // public URL (Cloudinary — Phase 36)
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ──────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────

doctorSchema.index({ name: 1 }); // default listing sort
doctorSchema.index({ specialization: 1 }); // filter used by the Phase 14 UI
// One doctor profile per linked account. A plain unique index would treat the
// many `user: null` (walk-in staff records) as duplicates of each other, and
// unique+sparse still indexes explicit nulls — so a *partial* index that only
// covers real ObjectIds is the correct constraint here.
doctorSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } }
);

// ──────────────────────────────────────────────
// doctorId generation — atomic counter (no races)
// ──────────────────────────────────────────────

/**
 * Next sequential id: DOC-0001, DOC-0002, …
 * Atomic `$inc` + upsert on a `counters` document (the Patient model uses
 * the same collection with a different _id key).
 * @returns {Promise<string>}
 */
const nextDoctorId = async () => {
  const counters = mongoose.connection.collection('counters');
  const result = await counters.findOneAndUpdate(
    { _id: 'doctorId' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  // Driver v6 returns the document; some wrappers return { value: doc }
  const doc =
    result && typeof result === 'object' && 'value' in result ? result.value : result;
  const seq = (doc && doc.seq) || 1;

  return `DOC-${String(seq).padStart(4, '0')}`;
};

doctorSchema.pre('validate', async function (next) {
  if (this.doctorId) return next(); // explicit id supplied
  try {
    this.doctorId = await nextDoctorId();
    next();
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const Doctor = mongoose.model('Doctor', doctorSchema);
Doctor.SPECIALIZATIONS = SPECIALIZATIONS;
Doctor.DAYS = DAYS;

module.exports = Doctor;
