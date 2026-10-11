/**
 * User.model.js — User model (Phase 05)
 *
 * Responsibilities:
 *  - Define the shared user schema (all roles share one collection)
 *  - Enforce unique, normalized emails
 *  - Hash passwords with bcryptjs before save (never store plaintext)
 *  - Expose matchPassword() for login verification (Phase 06)
 *
 * Passwords are `select: false` — they are excluded from queries by default.
 * Auth flows must ask for it explicitly: Model.findOne(...).select('+password')
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const ROLES = [
  'admin',
  'doctor',
  'patient',
  'receptionist',
  'pharmacist',
  'lab_technician',
];

const BCRYPT_SALT_ROUNDS = 12;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
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
      lowercase: true, // stored normalized: jane@Example.com → jane@example.com
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // excluded from queries by default
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^[0-9+\-\s()]{7,15}$/, 'Please provide a valid phone number'],
      // empty string / undefined is allowed (match is skipped for '')
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be one of: {VALUES}',
      },
      default: 'patient',
    },
    profileImage: {
      type: String,
      trim: true,
      default: '', // public URL (Cloudinary — Phase 36)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
    toJSON: {
      transform(_doc, ret) {
        delete ret.password; // never leak the hash, even if selected
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ──────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────

userSchema.index({ role: 1 }); // role-based listing (Phase 08+)

// ──────────────────────────────────────────────
// Pre-save: hash the password when it is new or changed
// ──────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Also hash on direct update queries (e.g. password reset via findOneAndUpdate)
userSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  const plain =
    (update && update.password) ||
    (update && update.$set && update.$set.password);

  if (!plain) return next();

  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    if (update.password) update.password = await bcrypt.hash(update.password, salt);
    if (update.$set && update.$set.password) {
      update.$set.password = await bcrypt.hash(update.$set.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// Instance methods
// ──────────────────────────────────────────────

/**
 * Compare a plain-text password with the stored hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.matchPassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;

module.exports = User;
