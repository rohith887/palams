const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/bin.controller');
const { binRegistrationValidation, binUpdateValidation } = require('../validators/bin.validator');

router.get('/', authenticate, ctrl.listBins);
router.get('/scan/:qrCode', authenticate, ctrl.scanBin);
router.get('/by-code/:binCode', authenticate, ctrl.getBinByCode);
router.get('/:binId', authenticate, ctrl.getBin);
router.get('/:binId/current-loading', authenticate, ctrl.getCurrentLoading);
router.post('/', authenticate, authorize('Administrator'), binRegistrationValidation, ctrl.registerBin);
router.put('/:binId', authenticate, authorize('Administrator'), binUpdateValidation, ctrl.updateBin);
router.delete('/:binId', authenticate, authorize('Administrator'), ctrl.deactivateBin);
router.post('/:binId/regenerate-qr', authenticate, authorize('Administrator'), ctrl.regenerateQr);
router.get('/by-code/:binCode/qr', authenticate, ctrl.getBinQr);

module.exports = router;
