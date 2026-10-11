/**
 * auth.middleware.js — JWT authentication & authorization middleware (Phase 06)
 *
 * Responsibilities:
 *  - protect: read `Authorization: Bearer <token>`, verify JWT, load the user,
 *    attach the (password-free) user document to req.user
 *  - authorizeRoles: 403 unless req.user.role is in the allowed list
 *
 * Both respond with the standard error shape and never leak internals.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { errorResponse } = require('../utils/apiResponse');
const { can } = require('../config/permissions');

/**
 * protect — Verifies the JWT token from the Authorization header.
 * Attaches req.user to every protected request.
 */
const protect = async (req, res, next) => {
  try {
    // ── 1. Extract token ──────────────────────────────────────────
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return errorResponse(
        res,
        'Not authorized — no token provided. Send "Authorization: Bearer <token>"',
        401
      );
    }

    // ── 2. Verify token ───────────────────────────────────────────
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'your_super_secret_jwt_key_min_32_chars') {
      console.error('❌ JWT_SECRET is missing or still a placeholder in backend/.env');
      return errorResponse(res, 'Server auth configuration error', 500);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret); // throws on invalid/expired
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired — please log in again'
          : 'Not authorized — invalid token';
      return errorResponse(res, message, 401);
    }

    // ── 3. Load user (password excluded by schema select:false) ───
    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 'Not authorized — user no longer exists', 401);
    }
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated — contact the administrator', 403);
    }

    // ── 4. Attach and continue ────────────────────────────────────
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * authorizeRoles — Checks that req.user has one of the allowed roles.
 * Must run after protect.
 * Usage: router.get('/route', protect, authorizeRoles('admin', 'doctor'), handler)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Not authorized — please log in first', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied — role "${req.user.role}" is not permitted for this route`,
        403
      );
    }
    return next();
  };
};

/**
 * requirePermission — Resource-level RBAC check (Phase 08).
 * Must run after protect. 403 unless the role holds "resource:action"
 * in config/permissions.js.
 *
 * Usage: router.get('/', protect, requirePermission('appointments', 'read'), handler)
 * Note: row-level scoping ("patient sees only OWN rows") belongs in the
 * resource controllers, not here.
 */
const requirePermission = (resource, action = 'read') => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Not authorized — please log in first', 401);
    }
    if (!can(req.user.role, `${resource}:${action}`)) {
      return errorResponse(
        res,
        `Access denied — role "${req.user.role}" cannot ${action} ${resource}`,
        403
      );
    }
    return next();
  };
};

module.exports = { protect, authorizeRoles, requirePermission };
