/** 
 * Admission.model.js — Admission management (Phase 17)
 * 
 * Responsibilities:
 *  - Store patient admission information linking patients and doctors
 *  - Track admission status through its lifecycle
 *  - Reference patient (User), doctor, and department (Phase 15)
 * 
 * Status lifecycle: pending → admitted → discharged/transferred/expired
 * 
 * RBAC note: read/write access enforced via requirePermission('admissions', ...)
 * in auth.middleware.js. Row-level scoping ("patient sees own admissions")
 * enforced in controllers.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const STATUSes = ['pending', 'admitted', 'discharged', 'transferred', 'expired'];

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const admissionSchema = new mongoose.Schema(
  {
    patient: {
      // Linked User account (role 'patient')
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctor: {
      // Linked Doctor profile (ObjectId)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
    },
    department: {
      // Reference to Department (Phase 15) or null
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    admissionDate: {
      type: Date,
      required: [true, 'Admission date is required'],
      validate: {
        validator: (value) => value >= new Date(),
        message: 'Admission date cannot be in the past',
      },
    },
    dischargeDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value >= this.admissionDate;
        },
        message: 'Discharge date must be after admission date',
      },
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: { values: STATUSes, message: 'Status must be one of: {VALUES}' },
      default: 'pending',
    },
    roomNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Room number cannot exceed 50 characters'],
      default: '',
    },
    bedNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Bed number cannot exceed 20 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
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

admissionSchema.index({ patient: 1 }); // patient's admissions
admissionSchema.index({ doctor: 1 }); // doctor's admissions
admissionSchema.index({ admissionDate: 1 }); // date-based queries
admissionSchema.index({ status: 1 }); // status-based filtering

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const Admission = mongoose.model('Admission', admissionSchema);
Admission.STATUSes = STATUSes;

module.exports = Admission;