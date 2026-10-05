/**
 * auth.middleware.js — JWT authentication middleware
 * Full implementation in Phase 06.
 */

const jwt = require('jsonwebtoken');

/**
 * protect — Verifies the JWT token from Authorization header.
 * Attaches req.user to every protected request.
 */
const protect = (req, res, next) => {
  // Implementation in Phase 06
  next();
};

/**
 * authorizeRoles — Checks that req.user has one of the allowed roles.
 * Usage: router.get('/route', protect, authorizeRoles('admin', 'doctor'), handler)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Implementation in Phase 08
    next();
  };
};

module.exports = { protect, authorizeRoles };
