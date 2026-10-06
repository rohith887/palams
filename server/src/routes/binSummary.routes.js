const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/binSummary.controller');

// GET /api/v1/bin-summary — Administrator only
router.get('/', authenticate, authorize('Administrator'), ctrl.getSummary);

module.exports = router;
