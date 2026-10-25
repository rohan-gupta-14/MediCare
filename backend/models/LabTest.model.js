/** 
 * LabTest.model.js — Lab test management (Phase 22)
 * 
 * Responsibilities:
 *  - Store lab test request information linked to a patient
 *  - Track test type, status, and results
 *  - Reference patient (User) and ordering doctor
 * 
 * RBAC note: read/write access enforced via requirePermission('labTests', ...)
 * in auth.middleware.js. Row-level scoping ("patient sees own lab tests")
 * enforced in controllers.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const STATUSes = ['pending', 'processing', 'completed', 'rejected'];

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const labTestSchema = new mongoose.Schema(
  {
    patient: {
      // Linked User account (role 'patient')
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctor: {
      // Ordering doctor (ObjectId)
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
    testType: {
      type: String,
      trim: true,
      maxlength: [100, 'Test type cannot exceed 100 characters'],
    },
    testName: {
      type: String,
      trim: true,
      maxlength: [100, 'Test name cannot exceed 100 characters'],
    },
    orderedDate: {
      type: Date,
      required: [true, 'Ordered date is required'],
      validate: {
        validator: (value) => value >= new Date(),
        message: 'Ordered date cannot be in the past',
      },
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: { values: STATUSes, message: 'Status must be one of: {VALUES}' },
      default: 'pending',
    },
    results: {
      type: String,
      trim: true,
    },
    referenceRange: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: '',
    },
    resultValue: {
      type: String,
      trim: true,
    },
    performedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
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

labTestSchema.index({ patient: 1 }); // patient's lab tests
labTestSchema.index({ doctor: 1 }); // doctor's lab tests
labTestSchema.index({ status: 1 }); // status-based filtering
labTestSchema.index({ orderedDate: 1 }); // date-based queries

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const LabTest = mongoose.model('LabTest', labTestSchema);
LabTest.STATUSes = STATUSes;

module.exports = LabTest;