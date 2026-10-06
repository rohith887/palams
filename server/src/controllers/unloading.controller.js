const { validationResult } = require('express-validator');
const unloadingService = require('../services/unloading.service');
const { success } = require('../utils/responseBuilder');

const unloadingController = {
  async completeUnloading(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, loadingId, quantityUnloaded, unloadingCondition, rowVersion, comments } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await unloadingService.completeUnloading({
        binId,
        userId,
        userRole,
        rowVersion,
        loadingId,
        quantityUnloaded,
        unloadingCondition,
        comments: comments || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      });

      res.status(201).json(success({
        unloadingId: result.unloadingId,
        message: 'Unloading completed successfully',
      }));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = unloadingController;