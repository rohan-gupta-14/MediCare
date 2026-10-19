/**
 * Patient.model.js — Patient profile (Phase 11)
 *
 * Responsibilities:
 *  - Store the demographic/medical profile for a patient, optionally linked
 *    to a User account (`user` — a receptionist can register walk-ins that
 *    have no login yet)
 *  - Auto-generate a unique, human-friendly patientId (PAT-0001) from an
 *    atomic counter so concurrent creates never collide
 *
 * Row-level access ("patient role sees only own record") is enforced in
 * controllers/patient.controller.js per the Phase 08 permissions note.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const GENDERS = ['male', 'female', 'other'];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;
const PATIENT_ID_REGEX = /^PAT-\d{4,}$/;

// ──────────────────────────────────────────────
// Sub-schemas
// ──────────────────────────────────────────────

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: [100, 'Contact name cannot exceed 100 characters'], default: '' },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [PHONE_REGEX, 'Please provide a valid emergency contact phone number'],
    },
    relationship: { type: String, trim: true, maxlength: [50, 'Relationship cannot exceed 50 characters'], default: '' },
  },
  { _id: false }
);

const medicalHistoryEntrySchema = new mongoose.Schema(
  {
    condition: {
      type: String,
      required: [true, 'Condition is required for a medical history entry'],
      trim: true,
      maxlength: [200, 'Condition cannot exceed 200 characters'],
    },
    diagnosedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: [1000, 'Notes cannot exceed 1000 characters'], default: '' },
  },
  { timestamps: true }
);

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const patientSchema = new mongoose.Schema(
  {
    user: {
      // Linked account (role 'patient'). Optional: walk-in patients may not
      // have login credentials yet (Phase 35 can link them later).
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    patientId: {
      type: String,
      unique: true, // unique index
      trim: true,
      uppercase: true,
      match: [PATIENT_ID_REGEX, 'patientId must look like PAT-0001'],
      // Generated in pre('validate') when not supplied explicitly
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [PHONE_REGEX, 'Please provide a valid phone number'],
    },
    gender: {
      type: String,
      enum: { values: GENDERS, message: 'Gender must be one of: {VALUES}' },
      required: [true, 'Gender is required'],
    },
    dateOfBirth: {
      type: Date,
      default: null,
      validate: {
        validator: (value) => !value || value <= new Date(),
        message: 'Date of birth cannot be in the future',
      },
    },
    bloodGroup: {
      type: String,
      enum: { values: ['', ...BLOOD_GROUPS], message: 'Blood group must be one of: {VALUES}' },
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
      default: '',
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    profileImage: {
      type: String,
      trim: true,
      default: '', // public URL (Cloudinary — Phase 36)
    },
    medicalHistory: {
      type: [medicalHistoryEntrySchema],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
      validate: {
        validator: (list) => list.every((a) => typeof a === 'string' && a.trim().length > 0),
        message: 'Allergies must be non-empty strings',
      },
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
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

patientSchema.index({ name: 1 }); // default listing sort
patientSchema.index({ user: 1 }); // "my record" lookup (row-level scoping)

// ──────────────────────────────────────────────
// patientId generation — atomic counter (no races)
// ──────────────────────────────────────────────

/**
 * Next sequential id: PAT-0001, PAT-0002, …
 * Uses a `counters` document with $inc + upsert so parallel creates
 * never receive the same number.
 * @returns {Promise<string>}
 */
const nextPatientId = async () => {
  const counters = mongoose.connection.collection('counters');
  const result = await counters.findOneAndUpdate(
    { _id: 'patientId' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  // Driver v6 returns the document; some wrappers return { value: doc }
  const doc =
    result && typeof result === 'object' && 'value' in result ? result.value : result;
  const seq = (doc && doc.seq) || 1;

  return `PAT-${String(seq).padStart(4, '0')}`;
};

patientSchema.pre('validate', async function (next) {
  if (this.patientId) return next(); // explicit id supplied
  try {
    this.patientId = await nextPatientId();
    next();
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const Patient = mongoose.model('Patient', patientSchema);
Patient.GENDERS = GENDERS;
Patient.BLOOD_GROUPS = BLOOD_GROUPS;

module.exports = Patient;
