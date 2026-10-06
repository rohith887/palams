const { body } = require('express-validator');

const startLoadingValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('bayId').isInt({ min: 1 }).withMessage('Valid Bay ID is required'),
  body('tankId').isInt({ min: 1 }).withMessage('Valid Tank ID is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
];

const completeLoadingValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('bayId').isInt({ min: 1 }).withMessage('Valid Bay ID is required'),
  body('tankId').isInt({ min: 1 }).withMessage('Valid Tank ID is required'),
  body('materialId').isInt({ min: 1 }).withMessage('Valid Material ID is required'),
  body('quantityLoaded').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('Quantity must be greater than zero'),
  body('unitOfMeasure').optional({ nullable: true }).trim().notEmpty().isString().withMessage('Unit of measure is required'),
  body('batchNumber').optional({ nullable: true }).trim().isString().withMessage('Batch number is required'),
  body('expectedUnloadingDate').optional({ nullable: true }).isISO8601().withMessage('Valid expected unloading date is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
  body('comments').optional({ nullable: true }).isString().isLength({ max: 500 }),
];

module.exports = { startLoadingValidation, completeLoadingValidation };