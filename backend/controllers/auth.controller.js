/**
 * auth.controller.js — Register / Login / Me (Phase 06)
 *
 * Responsibilities:
 *  - POST /api/auth/register — create user, hash password (model hook), return JWT
 *  - POST /api/auth/login   — verify credentials, return JWT
 *  - GET  /api/auth/me      — current authenticated user (from protect middleware)
 *
 * Never returns passwords: the User schema marks password `select: false`
 * and strips it in toJSON(), so safe responses are automatic.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { effectivePermissions } = require('../config/permissions');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Sign a JWT carrying only id + role (no PII in the token payload). */
const signToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_super_secret_jwt_key_min_32_chars') {
    const err = new Error('JWT_SECRET is missing or still a placeholder in backend/.env');
    err.statusCode = 500;
    throw err;
  }
  return jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
};

/** Minimal manual validation — returns an error message or null. */
const validateRegister = ({ name, email, password, phone, role }) => {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Name is required (min 2 characters)';
  }
  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return 'A valid email is required';
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password is required (min 8 characters)';
  }
  if (phone !== undefined && phone !== '' && !/^[0-9+\-\s()]{7,15}$/.test(phone)) {
    return 'Please provide a valid phone number';
  }
  if (role !== undefined && !User.ROLES.includes(role)) {
    return `Role must be one of: ${User.ROLES.join(', ')}`;
  }
  return null;
};

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, profileImage } = req.body || {};

    const validationError = validateRegister(req.body || {});
    if (validationError) return errorResponse(res, validationError, 400);

    // ── Duplicate email check (case-insensitive: schema lowercases) ─
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return errorResponse(res, 'An account with this email already exists', 409);
    }

    // ── Create (password is hashed by the model's pre-save hook) ────
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password, // plaintext here, bcrypt hash in the DB
      phone: phone || '',
      role: role || 'patient',
      profileImage: profileImage || '',
    });

    const token = signToken(user);

    return successResponse(
      res,
      { token, user },
      'Registration successful',
      201
    );
  } catch (error) {
    // Race-condition duplicate (unique index hit between check and create)
    if (error && error.code === 11000) {
      return errorResponse(res, 'An account with this email already exists', 409);
    }
    // Mongoose validation errors → 400 with per-field messages
    if (error && error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return errorResponse(res, messages.join('; '), 400, messages);
    }
    return next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return errorResponse(res, 'Email and password are required', 400);
    }

    // Need the hash explicitly — password is select:false in the schema
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

    // Same message for "no user" and "wrong password" — don't leak which is wrong
    if (!user || !(await user.matchPassword(password))) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated — contact the administrator', 403);
    }

    const token = signToken(user); // user.toJSON() strips the hash from `user`

    return successResponse(res, { token, user }, 'Login successful');
  } catch (error) {
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────-

const getMe = async (req, res, next) => {
  try {
    // Re-fetch fresh from DB (req.user is already password-free)
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, user, 'Current user');
  } catch (error) {
    return next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/auth/permissions  (protected) — Phase 08
// ─────────────────────────────────────────────

const getMyPermissions = async (req, res, next) => {
  try {
    return successResponse(
      res,
      {
        role: req.user.role,
        permissions: effectivePermissions(req.user.role),
      },
      'Effective permissions for current user'
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, getMe, getMyPermissions };
