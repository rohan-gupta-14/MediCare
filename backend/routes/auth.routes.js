/**
 * auth.routes.js — Authentication routes (Phase 06)
 *
 * POST /api/auth/register    Public — create an account, returns JWT
 * POST /api/auth/login       Public — verify credentials, returns JWT
 * GET  /api/auth/me          Protected — current authenticated user
 * GET  /api/auth/permissions Protected — effective RBAC permissions (Phase 08)
 */

const express = require('express');
const { register, login, getMe, getMyPermissions } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/permissions', protect, getMyPermissions);

module.exports = router;
