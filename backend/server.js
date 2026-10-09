const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Human-readable MongoDB ready states (mongoose.connection.readyState)
const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// Health Check (includes database status)
// ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;

  res.json({
    success: true,
    message: 'MediCare API is running',
    database: DB_STATES[dbState] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────
// Routes (added progressively per phase)
// ──────────────────────────────────────────────
// Phase 06: app.use('/api/auth', require('./routes/auth.routes'));
// Phase 11: app.use('/api/patients', require('./routes/patient.routes'));
// Phase 13: app.use('/api/doctors', require('./routes/doctor.routes'));
// Phase 15: app.use('/api/departments', require('./routes/department.routes'));
// Phase 16: app.use('/api/appointments', require('./routes/appointment.routes'));
// Phase 21: app.use('/api/medical-records', require('./routes/medicalRecord.routes'));
// Phase 23: app.use('/api/prescriptions', require('./routes/prescription.routes'));
// Phase 25: app.use('/api/medicines', require('./routes/medicine.routes'));
// Phase 28: app.use('/api/lab-tests', require('./routes/labTest.routes'));
// Phase 30: app.use('/api/wards', require('./routes/ward.routes'));
// Phase 33: app.use('/api/invoices', require('./routes/invoice.routes'));
// Phase 38: app.use('/api/notifications', require('./routes/notification.routes'));

// ──────────────────────────────────────────────
// 404 handler
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ──────────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ──────────────────────────────────────────────
// Start server (after DB connection attempt)
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const dbConnected = await connectDB();

  // Production must never run without a database
  if (!dbConnected && process.env.NODE_ENV === 'production') {
    console.error('❌ Startup aborted: database connection failed in production.');
    process.exit(1);
  }

  // In development we still boot so the API/health check remain testable
  if (!dbConnected) {
    console.warn('⚠️  Starting WITHOUT database — data features (Phase 05+) will fail until MONGO_URI is set.');
  }

  app.listen(PORT, () => {
    console.log(`✅ MediCare API running on http://localhost:${PORT}`);
    console.log(`🌿 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${DB_STATES[mongoose.connection.readyState]}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();

module.exports = app;
