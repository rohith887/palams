const { validationResult } = require('express-validator');
const qaService = require('../services/qa.service');
const { success } = require('../utils/responseBuilder');

const qaController = {
  async startQA(req, res, next) {
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

      const result = await qaService.startQA({ binId, userId, userRole, rowVersion });

      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async completeQA(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() },
        });
      }

      const {
        binId, rowVersion,
        visual, visualNotes, residue, residueNotes,
        damage, damageNotes, odor, odorNotes,
        label, labelNotes, seal, sealNotes,
        overallResult, failureReason,
      } = req.body;
      const { userId, role: userRole } = req.user;

      const result = await qaService.completeQA({
        binId, userId, userRole, rowVersion,
        visual, visualNotes, residue, residueNotes,
        damage, damageNotes, odor, odorNotes,
        label, labelNotes, seal, sealNotes,
        overallResult, failureReason,
      });

      res.status(201).json(success({
        qaId: result.qaId,
        finalStatus: result.finalStatus,
        message: `QA ${overallResult === 'PASS' ? 'passed' : 'failed'} successfully`,
      }));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = qaController;