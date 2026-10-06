const { body } = require('express-validator');

const completeUnloadingValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('loadingId').isInt({ min: 1 }).withMessage('Valid Loading ID is required'),
  body('quantityUnloaded').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('Quantity unloaded must be greater than zero'),
  body('unloadingCondition').isIn(['Normal', 'Damaged', 'Contamination_Suspected']).withMessage('Invalid unloading condition'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
  body('comments').optional({ nullable: true }).isString().isLength({ max: 500 }),
];

module.exports = { completeUnloadingValidation };