/**
 * PBLMS — Auth Request Validators
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Express-validator schemas for authentication endpoints.
 */

const { body } = require('express-validator');

const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .withMessage('Username must be a string'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string'),
];

module.exports = { loginValidation };