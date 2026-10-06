const { body } = require('express-validator');

const createUserValidation = [
  body('employeeId').optional({ nullable: true }).trim().isString().withMessage('Employee ID must be a string'),
  body('username').trim().notEmpty().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').trim().notEmpty().isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('fullName').trim().notEmpty().isLength({ max: 150 }).withMessage('Full name is required (max 150 characters)'),
  body('role').trim().notEmpty().isIn(['Administrator', 'Loader', 'Unloader', 'Cleaner', 'QA_Inspector']).withMessage('Invalid role'),
  body('email').optional({ nullable: true }).trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional({ nullable: true }).trim().matches(/^[+]?[\d\s()-]{7,20}$/).withMessage('Valid phone number is required'),
  body('department').optional({ nullable: true }).trim().isString().isLength({ max: 100 }).withMessage('Department must be under 100 characters'),
  body('designation').optional({ nullable: true }).trim().isString().isLength({ max: 100 }).withMessage('Designation must be under 100 characters'),
];

const updateUserValidation = [
  body('employeeId').optional({ nullable: true }).trim().isString().withMessage('Employee ID must be a string'),
  body('fullName').optional({ nullable: true }).trim().notEmpty().isLength({ max: 150 }).withMessage('Full name must be under 150 characters'),
  body('role').optional({ nullable: true }).trim().isIn(['Administrator', 'Loader', 'Unloader', 'Cleaner', 'QA_Inspector']).withMessage('Invalid role'),
  body('email').optional({ nullable: true }).trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional({ nullable: true }).trim().matches(/^[+]?[\d\s()-]{7,20}$/).withMessage('Valid phone number is required'),
  body('department').optional({ nullable: true }).trim().isString().isLength({ max: 100 }).withMessage('Department must be under 100 characters'),
  body('designation').optional({ nullable: true }).trim().isString().isLength({ max: 100 }).withMessage('Designation must be under 100 characters'),
  body('isActive').optional({ nullable: true }).isBoolean().withMessage('isActive must be a boolean'),
];

module.exports = { createUserValidation, updateUserValidation };
