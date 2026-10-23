/**
 * Department.model.js — Hospital department (Phase 15)
 *
 * Responsibilities:
 *  - Store the hospital's departments (name, description, location, status)
 *  - Optionally link a head doctor (`headDoctor` — a Doctor profile). A
 *    doctor may head at most one department: enforced with a *partial*
 *    unique index (Lesson from Phase 13 — sparse still indexes explicit
 *    nulls, which produces false E11000s on unheaded departments).
 *
 * The Doctor model keeps its free-text `department` string (Phase 13)
 * untouched; linking the two models is a later concern.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const STATUSES = ['active', 'inactive'];

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      minlength: [2, 'Department name must be at least 2 characters'],
      maxlength: [100, 'Department name cannot exceed 100 characters'],
      unique: true, // unique index — one department per name
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    headDoctor: {
      // Optional — a department may not have a head assigned yet.
      // A doctor heads at most one department (partial unique index below).
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: `Status must be one of: ${STATUSES.join(', ')}`,
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// One doctor heads at most one department — partial (not sparse) so that
// multiple `null` heads never collide (Phase 13 lesson).
departmentSchema.index(
  { headDoctor: 1 },
  { unique: true, partialFilterExpression: { headDoctor: { $type: 'objectId' } } }
);

departmentSchema.index({ status: 1 });

const Department = mongoose.model('Department', departmentSchema);
Department.STATUSES = STATUSES;

module.exports = Department;
