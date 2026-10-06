const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/audit.controller');

// GET /api/v1/audit/history — Administrator only
router.get('/history', authenticate, authorize('Administrator'), ctrl.getAuditHistory);

// GET /api/v1/audit/log — Administrator only (frontend audit trail page)
router.get('/log', authenticate, authorize('Administrator'), ctrl.getAuditLog);

// GET /api/v1/audit/bin-history — Administrator only (frontend bin history page)
router.get('/bin-history', authenticate, authorize('Administrator'), ctrl.getBinHistory);

// GET /api/v1/audit/action-types — Administrator only (filter dropdown)
router.get('/action-types', authenticate, authorize('Administrator'), ctrl.getActionTypes);

// GET /api/v1/audit/actors — Administrator only (filter dropdown)
router.get('/actors', authenticate, authorize('Administrator'), ctrl.getActors);

module.exports = router;