const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/loading.controller');
const { completeLoadingValidation } = require('../validators/loading.validator');

// POST /api/v1/loading/complete — Loader role only
router.post('/complete', authenticate, authorize('Loader'), completeLoadingValidation, ctrl.completeLoading);

module.exports = router;