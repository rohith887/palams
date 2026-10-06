const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/report.controller');

// POST /api/v1/reports/generate — Administrator only
router.post('/generate', authenticate, authorize('Administrator'), ctrl.generateReport);

// GET /api/v1/reports/exceptions — Administrator only
router.get('/exceptions', authenticate, authorize('Administrator'), ctrl.getExceptions);

module.exports = router;