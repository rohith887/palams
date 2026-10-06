const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/dashboard.controller');

// GET /api/v1/dashboard — any authenticated role
router.get('/', authenticate, ctrl.getMetrics);

// GET /api/v1/dashboard/admin — Administrator aggregated dashboard (single call)
router.get('/admin', authenticate, authorize('Administrator'), ctrl.getAdminDashboard);

// GET /api/v1/dashboard/operator — any operator role
router.get('/operator', authenticate, ctrl.getOperatorDashboard);

// GET /api/v1/dashboard/operator-performance — Administrator only
router.get('/operator-performance', authenticate, authorize('Administrator'), ctrl.getOperatorPerformance);

// GET /api/v1/dashboard/live-operations — Administrator only
router.get('/live-operations', authenticate, authorize('Administrator'), ctrl.getLiveOperations);

module.exports = router;