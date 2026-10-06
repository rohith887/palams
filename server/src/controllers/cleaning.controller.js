const { validationResult } = require('express-validator');
const cleaningService = require('../services/cleaning.service');
const { success } = require('../utils/responseBuilder');

const cleaningController = {
  async startCleaning(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, rowVersion } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await cleaningService.startCleaning({ binId, userId, userRole, rowVersion });

      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async completeCleaning(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, method, agent, waterTemp, rinseCycles, comments, rowVersion } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await cleaningService.completeCleaning({
        binId, userId, userRole, method, agent, waterTemp, rinseCycles,
        comments: comments || null, rowVersion,
        ipAddress: req.ip, userAgent: req.get('user-agent') || null,
      });

      res.status(201).json(success({
        cleaningId: result.cleaningId,
        nextStatus: result.nextStatus,
        message: 'Cleaning completed successfully',
      }));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = cleaningController;