const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/qa.controller');
const dashboardCtrl = require('../controllers/qaDashboard.controller');
const queueCtrl = require('../controllers/qaQueue.controller');
const workspaceCtrl = require('../controllers/qaWorkspace.controller');
const { startQAValidation, completeQAValidation } = require('../validators/qa.validator');

// GET /api/v1/qa/dashboard — QA_Inspector role only
router.get('/dashboard', authenticate, authorize('QA_Inspector'), dashboardCtrl.getDashboard);

// GET /api/v1/qa/queue — QA_Inspector role only
router.get('/queue', authenticate, authorize('QA_Inspector'), queueCtrl.getQueue);

// GET /api/v1/qa/workspace/:binId — QA_Inspector role only
router.get('/workspace/:binId', authenticate, authorize('QA_Inspector'), workspaceCtrl.getWorkspace);

// POST /api/v1/qa/start — QA_Inspector role only
router.post('/start', authenticate, authorize('QA_Inspector'), startQAValidation, ctrl.startQA);

// POST /api/v1/qa/complete — QA_Inspector role only
router.post('/complete', authenticate, authorize('QA_Inspector'), completeQAValidation, ctrl.completeQA);

module.exports = router;