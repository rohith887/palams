const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/cleaning.controller');
const { startCleaningValidation, completeCleaningValidation } = require('../validators/cleaning.validator');

// POST /api/v1/cleaning/start — Cleaner role only
router.post('/start', authenticate, authorize('Cleaner'), startCleaningValidation, ctrl.startCleaning);

// POST /api/v1/cleaning/complete — Cleaner role only
router.post('/complete', authenticate, authorize('Cleaner'), completeCleaningValidation, ctrl.completeCleaning);

module.exports = router;