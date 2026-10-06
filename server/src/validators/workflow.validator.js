const { body } = require('express-validator');

const startOperationValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
  body('fromStatus').trim().notEmpty().isString().withMessage('From status is required'),
  body('toStatus').trim().notEmpty().isString().withMessage('To status is required'),
  body('operationType').trim().notEmpty().isString().withMessage('Operation type is required'),
];

const completeOperationValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
  body('fromStatus').trim().notEmpty().isString().withMessage('From status is required'),
  body('toStatus').trim().notEmpty().isString().withMessage('To status is required'),
  body('operationType').trim().notEmpty().isString().withMessage('Operation type is required'),
];

const validateTransitionValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('fromStatus').trim().notEmpty().isString().withMessage('From status is required'),
  body('toStatus').trim().notEmpty().isString().withMessage('To status is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
];

module.exports = { startOperationValidation, completeOperationValidation, validateTransitionValidation };