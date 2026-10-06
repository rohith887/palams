const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/master.controller');
const { bayValidation, tankValidation, materialValidation } = require('../validators/master.validator');


// Bays
router.get('/bays', authenticate, ctrl.listBays);
router.post('/bays', authenticate, authorize('Administrator'), bayValidation, ctrl.createBay);
router.put('/bays/:bayId', authenticate, authorize('Administrator'), ctrl.updateBay);
router.delete('/bays/:bayId', authenticate, authorize('Administrator'), ctrl.deactivateBay);

// Tanks
router.get('/bays/:bayId/tanks', authenticate, ctrl.listTanks);
router.get('/tanks', authenticate, ctrl.listTanks);
router.post('/tanks', authenticate, authorize('Administrator'), tankValidation, ctrl.createTank);
router.put('/tanks/:tankId', authenticate, authorize('Administrator'), ctrl.updateTank);
router.delete('/tanks/:tankId', authenticate, authorize('Administrator'), ctrl.deactivateTank);

// Materials
router.get('/materials', authenticate, ctrl.listMaterials);
router.post('/materials', authenticate, authorize('Administrator'), materialValidation, ctrl.createMaterial);
router.put('/materials/:materialId', authenticate, authorize('Administrator'), ctrl.updateMaterial);
router.delete('/materials/:materialId', authenticate, authorize('Administrator'), ctrl.deactivateMaterial);

// Lookups (read-only, any authenticated)
router.get('/bin-types', authenticate, ctrl.listBinTypes);
router.get('/bin-categories', authenticate, ctrl.listBinCategories);

module.exports = router;