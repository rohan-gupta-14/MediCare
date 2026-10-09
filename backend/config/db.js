/**
 * db.js — MongoDB connection via Mongoose (Phase 04)
 *
 * Responsibilities:
 *  - Validate MONGO_URI before attempting to connect
 *  - Connect with sensible timeouts (fail fast instead of hanging 30s)
 *  - Log connection lifecycle events (error / disconnected / reconnected)
 *  - Never throw — returns true/false so server.js can decide how to start
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // ── 1. Guard: missing or placeholder URI ──────────────────────────
  if (!uri || uri.includes('<username>')) {
    console.warn('⚠️  MONGO_URI is missing or still a placeholder in backend/.env');
    console.warn('   Add your MongoDB Atlas connection string (see backend/.env.example)');
    return false;
  }

  // ── 2. Connect ────────────────────────────────────────────────────
  try {
    mongoose.set('strictQuery', true); // only schema-defined fields are queried

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // give up after 10s instead of 30s
      socketTimeoutMS: 45000,          // close idle sockets after 45s
    });

    const { host, name } = mongoose.connection;
    console.log(`✅ MongoDB connected → host: ${host}, database: ${name}`);

    // ── 3. Lifecycle logging (after initial connect) ────────────────
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('🔁 MongoDB reconnected');
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

module.exports = connectDB;
