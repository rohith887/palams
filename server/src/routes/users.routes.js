const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/user.controller');
const { createUserValidation, updateUserValidation } = require('../validators/user.validator');

router.get('/', authenticate, authorize('Administrator'), ctrl.listUsers);
router.get('/roles', authenticate, ctrl.getRoles);
router.get('/:userId', authenticate, authorize('Administrator'), ctrl.getUserById);
router.post('/', authenticate, authorize('Administrator'), createUserValidation, ctrl.createUser);
router.put('/:userId', authenticate, authorize('Administrator'), updateUserValidation, ctrl.updateUser);
router.patch('/:userId/deactivate', authenticate, authorize('Administrator'), ctrl.deactivateUser);
router.patch('/:userId/activate', authenticate, authorize('Administrator'), ctrl.activateUser);
router.post('/:userId/reset-password', authenticate, authorize('Administrator'), ctrl.resetPassword);
router.delete('/:userId', authenticate, authorize('Administrator'), ctrl.deleteUser);

module.exports = router;
                                                                                                                                                                                            