const { body } = require('express-validator');

const binRegistrationValidation = [
  body('binTypeId').isInt({ min: 1 }).withMessage('Valid bin type is required'),
  body('binCategoryId').isInt({ min: 1 }).withMessage('Valid bin category is required'),
  body('capacity').isFloat({ gt: 0 }).withMessage('Capacity must be greater than zero'),
  body('capacityUnit').trim().notEmpty().isString().withMessage('Capacity unit is required'),
];

const binUpdateValidation = [
  body('binTypeId').isInt({ min: 1 }).withMessage('Valid bin type is required'),
  body('binCategoryId').isInt({ min: 1 }).withMessage('Valid bin category is required'),
  body('capacity').isFloat({ gt: 0 }).withMessage('Capacity must be greater than zero'),
  body('capacityUnit').trim().notEmpty().isString().withMessage('Capacity unit is required'),
];

module.exports = { binRegistrationValidation, binUpdateValidation };
