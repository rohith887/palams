const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginValidation } = require('../validators/auth.validator');
const authenticate = require('../middleware/authenticate');
const rateLimiter = require('../middleware/rateLimiter');

router.use(rateLimiter);

router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;