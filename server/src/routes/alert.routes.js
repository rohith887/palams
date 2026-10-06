const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/alert.controller');

// GET /api/v1/alerts — Administrator only (with optional query filters)
router.get('/', authenticate, authorize('Administrator'), ctrl.getAlerts);

// GET /api/v1/alerts/counts — Severity counts
router.get('/counts', authenticate, authorize('Administrator'), ctrl.getSeverityCounts);

// PATCH /api/v1/alerts/:alertId/acknowledge
router.patch('/:alertId/acknowledge', authenticate, authorize('Administrator'), ctrl.acknowledgeAlert);

// PATCH /api/v1/alerts/:alertId/assign
router.patch('/:alertId/assign', authenticate, authorize('Administrator'), ctrl.assignAlert);

// PATCH /api/v1/alerts/:alertId/resolve
router.patch('/:alertId/resolve', authenticate, authorize('Administrator'), ctrl.resolveAlert);

module.exports = router;