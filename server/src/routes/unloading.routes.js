const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/unloading.controller');
const { completeUnloadingValidation } = require('../validators/unloading.validator');

// POST /api/v1/unloading/complete — Unloader role only
router.post('/complete', authenticate, authorize('Unloader'), completeUnloadingValidation, ctrl.completeUnloading);

module.exports = router;