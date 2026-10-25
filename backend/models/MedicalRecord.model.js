/** 
 * MedicalRecord.model.js — Medical record (Phase 18)
 * 
 * Responsibilities:
 *  - Store a patient's medical record/history
 *  - Reference patient (User) and attending doctor
 *  - Track record status and key clinical information
 * 
 * RBAC note: read/write access enforced via requirePermission('medicalRecords', ...)
 * in auth.middleware.js. Row-level scoping ("patient sees own records") enforced in controllers.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const STATUSes = ['active', 'archived'];

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      // Linked User account (role 'patient')
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctor: {
      // Attending doctor (ObjectId)
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
    admission: {
      // Reference to Admission (Phase 17) if the record is admission-related
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    title: {
      // Record title/summary (e.g., "Initial consultation", "Follow-up")
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    chiefComplaint: {
      type: String,
      trim: true,
      maxlength: [500, 'Chief complaint cannot exceed 500 characters'],
    },
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [500, 'Diagnosis cannot exceed 500 characters'],
    },
    prescriptionSummary: {
      type: String,
      trim: true,
      maxlength: [500, 'Prescription summary cannot exceed 500 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: { values: STATUSes, message: 'Status must be one of: {VALUES}' },
      default: 'active',
    },
    vitalsTemperature: {
      type: Number,
      min: 30,
      max: 45,
      description: 'Body temperature in °C',
    },
    vitalsBloodPressureSystolic: {
      type: Number,
      min: 50,
      max: 300,
      description: 'Systolic blood pressure',
    },
    vitalsBloodPressureDiastolic: {
      type: Number,
      min: 25,
      max: 200,
      description: 'Diastolic blood pressure',
    },
    vitalsHeartRate: {
      type: Number,
      min: 10,
      max: 250,
      description: 'Heart rate in bpm',
    },
    vitalsRespiratoryRate: {
      type: Number,
      min: 5,
      max: 60,
      description: 'Respiratory rate in breaths/min',
    },
    vitalsOxygenSaturation: {
      type: Number,
      min: 50,
      max: 100,
      description: 'Oxygen saturation %',
    },
    heightValue: {
      type: Number,
      min: 50,
      max: 300,
      description: 'Height in cm',
    },
    heightUnit: {
      type: String,
      enum: ['cm', 'm', 'in', 'ft'],
      default: 'cm',
    },
    weightValue: {
      type: Number,
      min: 10,
      max: 500,
      description: 'Weight in kg',
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lb', 'st'],
      default: 'kg',
    },
    allergies: [{
      type: String,
      trim: true,
    }],
    medications: [{
      name: {
        type: String,
        trim: true,
      },
      dosage: {
        type: String,
        trim: true,
      },
      frequency: {
        type: String,
        trim: true,
      },
      startDate: Date,
      endDate: Date,
    }],
    labOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabTest',
    }],
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

medicalRecordSchema.index({ patient: 1 }); // patient's medical records
medicalRecordSchema.index({ doctor: 1 }); // doctor's records
medicalRecordSchema.index({ status: 1 }); // status-based filtering
medicalRecordSchema.index({ createdAt: 1 }); // chronological queries

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
MedicalRecord.STATUSes = STATUSes;

module.exports = MedicalRecord;