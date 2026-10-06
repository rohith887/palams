const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/workflow.controller');
const {
  startOperationValidation,
  completeOperationValidation,
  validateTransitionValidation,
} = require('../validators/workflow.validator');

// POST /api/v1/workflow/start — generic workflow start (any authenticated role)
router.post('/start', authenticate, startOperationValidation, ctrl.startOperation);

// POST /api/v1/workflow/complete — generic workflow complete (any authenticated role)
router.post('/complete', authenticate, completeOperationValidation, ctrl.completeOperation);

// POST /api/v1/workflow/validate — validate transition without executing (any authenticated role)
router.post('/validate', authenticate, validateTransitionValidation, ctrl.validateTransition);

// POST /api/v1/workflow/validate-scan — structured workflow validation after QR scan
router.post('/validate-scan', authenticate, ctrl.validateScan);

module.exports = router;