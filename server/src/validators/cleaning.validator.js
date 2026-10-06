const { body } = require('express-validator');

const startCleaningValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
];

const completeCleaningValidation = [
  body('binId').isInt({ min: 1 }).withMessage('Valid Bin ID is required'),
  body('method').optional({ nullable: true }).isIn(['Rinse', 'Chemical_Wash', 'Steam_Clean']).withMessage('Invalid cleaning method'),
  body('agent').optional({ nullable: true }).trim().isString().isLength({ max: 100 }).withMessage('Cleaning agent is required (max 100 chars)'),
  body('waterTemp').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('Water temperature must be 0-100°C'),
  body('rinseCycles').optional({ nullable: true }).isInt({ min: 1 }).withMessage('At least 1 rinse cycle required'),
  body('comments').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('rowVersion').isInt({ min: 1 }).withMessage('Row version is required'),
];

module.exports = { startCleaningValidation, completeCleaningValidation };