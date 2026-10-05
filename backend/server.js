const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

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
// Health Check
// ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MediCare API is running',
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
// Start server
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ MediCare API running on http://localhost:${PORT}`);
  console.log(`🌿 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
