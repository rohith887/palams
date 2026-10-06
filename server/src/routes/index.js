const express = require('express');
const router = express.Router();

router.use('/health', require('./health.routes'));
router.use('/v1/auth', require('./auth.routes'));
router.use('/v1/masters', require('./master.routes'));
router.use('/v1/bins', require('./bin.routes'));
router.use('/v1/workflow', require('./workflow.routes'));
router.use('/v1/loading', require('./loading.routes'));
router.use('/v1/unloading', require('./unloading.routes'));
router.use('/v1/cleaning', require('./cleaning.routes'));
router.use('/v1/qa', require('./qa.routes'));
router.use('/v1/dashboard', require('./dashboard.routes'));
router.use('/v1/alerts', require('./alert.routes'));
router.use('/v1/reports', require('./report.routes'));
router.use('/v1/audit', require('./audit.routes'));
router.use('/v1/logs', require('./systemLog.routes'));
router.use('/v1/users', require('./users.routes'));
router.use('/v1/sessions', require('./session.routes'));
router.use('/v1/bin-summary', require('./binSummary.routes'));

module.exports = router;