/** 
 * Prescription.model.js — Prescription management (Phase 21)
 * 
 * Responsibilities:
 *  - Store prescription information linked to a patient and doctor
 *  - Track medication details, dosage, frequency, and status
 *  - Reference patient (User), doctor, and optionally department (Phase 15)
 * 
 * RBAC note: read/write access enforced via requirePermission('prescriptions', ...)
 * in auth.middleware.js. Row-level scoping ("patient sees own prescriptions")
 * enforced in controllers.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const STATUSes = ['active', 'completed', 'cancelled'];

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      // Linked User account (role 'patient')
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctor: {
      // Prescribing doctor (ObjectId)
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
    appointment: {
      // Reference to Appointment (Phase 16) if prescription is for a specific appointment
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    title: {
      // Prescription title/summary (e.g., "Initial prescription", "Refill")
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: { values: STATUSes, message: 'Status must be one of: {VALUES}' },
      default: 'active',
    },
    startedDate: {
      type: Date,
      description: 'When the prescription treatment started',
    },
    endedDate: {
      type: Date,
      description: 'When the prescription treatment ended',
    },
    refills: {
      type: Number,
      minimum: 0,
      default: 0,
      description: 'Number of refills remaining',
    },
    medication: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Medication name cannot exceed 100 characters'],
      },
      dosage: {
        type: String,
        trim: true,
        description: 'Dosage instructions (e.g., "500mg twice daily")',
      },
      frequency: {
        type: String,
        trim: true,
        description: 'Frequency (e.g., "BID", "TID", "once daily")',
      },
      duration: {
        type: String,
        trim: true,
        description: 'Treatment duration (e.g., "7 days", "2 weeks")',
      },
      strength: {
        type: String,
        trim: true,
        description: 'Strength (e.g., "500mg", "10% cream")',
      },
      form: {
        type: String,
        trim: true,
        enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'inhaler', 'other'],
        default: 'tablet',
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    allergiesAlert: {
      type: String,
      trim: true,
      maxlength: [500, 'Allergies alert cannot exceed 500 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
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

prescriptionSchema.index({ patient: 1 }); // patient's prescriptions
prescriptionSchema.index({ doctor: 1 }); // doctor's prescriptions
prescriptionSchema.index({ status: 1 }); // status-based filtering
prescriptionSchema.index({ createdAt: 1 }); // chronological queries

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const Prescription = mongoose.model('Prescription', prescriptionSchema);
Prescription.STATUSes = STATUSes;

module.exports = Prescription;