const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/systemLog.controller');

router.get('/', authenticate, authorize('Administrator'), ctrl.getLogs);
router.get('/download', authenticate, authorize('Administrator'), ctrl.downloadLogs);
router.get('/modules', authenticate, authorize('Administrator'), ctrl.getModules);
router.get('/actions', authenticate, authorize('Administrator'), ctrl.getActions);
router.get('/levels', authenticate, authorize('Administrator'), ctrl.getLevels);

module.exports = router;
