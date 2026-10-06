const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/session.controller');

router.post('/check-recovery', authenticate, ctrl.checkRecovery);
router.post('/update-status', authenticate, ctrl.updateStatus);
router.post('/cancel', authenticate, ctrl.cancelSession);
router.post('/heartbeat', authenticate, ctrl.heartbeat);
router.post('/log-activity', authenticate, ctrl.logActivity);

module.exports = router;
