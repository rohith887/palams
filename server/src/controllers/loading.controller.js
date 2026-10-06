const { validationResult } = require('express-validator');
const loadingService = require('../services/loading.service');
const { success } = require('../utils/responseBuilder');

const loadingController = {
  /**
   * POST /api/v1/loading/complete
   * Completes a loading operation and creates a Loading_Record.
   */
  async completeLoading(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const { binId, bayId, tankId, materialId, quantityLoaded, unitOfMeasure, batchNumber, expectedUnloadingDate, rowVersion, comments } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await loadingService.completeLoading({
        binId,
        userId,
        userRole,
        rowVersion,
        bayId,
        tankId,
        materialId,
        quantityLoaded,
        unitOfMeasure,
        batchNumber,
        expectedUnloadingDate,
        comments: comments || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      });

      res.status(201).json(success({
        loadingId: result.loadingId,
        message: 'Loading completed successfully',
      }));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = loadingController;