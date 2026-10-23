/**
 * Appointment.model.js — Appointment booking system (Phase 16)
 *
 * Responsibilities:
 *  - Store appointment booking information linking patients and doctors
 *  - Track appointment status through its lifecycle
 *  - Reference patient (User), doctor, and department
 *  - Consume doctor availability slots (Phase 16+ booking flow)
 *
 * Status lifecycle: pending → confirmed → completed/cancelled/rejected
 *
 * RBAC note: read/write access enforced via requirePermission('appointments', ...)
 * in auth.middleware.js. Row-level scoping ("patient sees own appointments")
 * enforced in controllers.
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const STATUSes = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const appointmentSchema = new mongoose.Schema(
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
      // Reference to Department (Phase 15) or free-text
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      validate: {
        validator: (value) => value >= new Date(),
        message: 'Appointment date cannot be in the past',
      },
    },
    appointmentTime: {
      type: String,
      required: [true, 'Appointment time is required (HH:MM)'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Appointment time must look like HH:MM (24h)'],
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

appointmentSchema.index({ patient: 1 }); // patient's appointments
appointmentSchema.index({ doctor: 1 }); // doctor's appointments
appointmentSchema.index({ appointmentDate: 1 }); // date-based queries
appointmentSchema.index({ status: 1 }); // status-based filtering

// ──────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────

const Appointment = mongoose.model('Appointment', appointmentSchema);

Appointment.STATUSes = STATUSes;

module.exports = Appointment;