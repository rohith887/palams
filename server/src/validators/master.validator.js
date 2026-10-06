const { body, param, query } = require('express-validator');

const bayValidation = [
  body('bayCode').trim().notEmpty().isString().withMessage('Bay code is required'),
  body('bayName').trim().notEmpty().isString().withMessage('Bay name is required'),
  body('locationDescription').optional({ nullable: true }).isString(),
];

const tankValidation = [
  body('bayId').isInt({ min: 1 }).withMessage('Valid Bay ID is required'),
  body('tankCode').trim().notEmpty().isString().withMessage('Tank code is required'),
  body('tankName').trim().notEmpty().isString().withMessage('Tank name is required'),
  body('tankCapacity').optional({ nullable: true }).isFloat({ min: 0 }),
];

const materialValidation = [
  body('materialCode').trim().notEmpty().isString().withMessage('Material code is required'),
  body('materialName').trim().notEmpty().isString().withMessage('Material name is required'),
  body('materialCategory').optional({ nullable: true }).isString(),
  body('hazardLevel').isIn(['Low', 'Medium', 'High']).withMessage('Hazard level must be Low, Medium, or High'),
  body('tempMin').optional({ nullable: true }).isFloat(),
  body('tempMax').optional({ nullable: true }).isFloat(),
  body('handlingInstructions').optional({ nullable: true }).isString().isLength({ max: 1000 }),
];

module.exports = { bayValidation, tankValidation, materialValidation };