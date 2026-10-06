const sessionService = require('../services/session.service');
const { success } = require('../utils/responseBuilder');
const logger = require('../utils/logger');

const sessionController = {
  async checkRecovery(req, res, next) {
    try {
      const { binId, qrCodeValue } = req.body;
      const { userId } = req.user;

      if (!binId) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'binId is required' },
        });
      }

      const result = await sessionService.checkScanRecovery({ binId, userId, qrCodeValue });
      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { sessionId, status, metadata } = req.body;
      if (!sessionId || !status) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'sessionId and status are required' },
        });
      }
      await sessionService.updateSessionStatus(sessionId, status, metadata);
      res.status(200).json(success({ sessionId, status }));
    } catch (err) {
      next(err);
    }
  },

  async cancelSession(req, res, next) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'sessionId is required' },
        });
      }
      await sessionService.cancelSession(sessionId);
      res.status(200).json(success({ sessionId, status: 'CANCELLED' }));
    } catch (err) {
      next(err);
    }
  },

  async heartbeat(req, res, next) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({
          success: false, data: null,
          error: { code: 'VALIDATION_ERROR', message: 'sessionId is required' },
        });
      }
      await sessionService.heartbeat(sessionId);
      res.status(200).json(success({ sessionId }));
    } catch (err) {
      next(err);
    }
  },

  async logActivity(req, res, next) {
    try {
      const { events, eventType, metadata } = req.body;
      const userId = req.user?.userId;
      if (events && Array.isArray(events)) {
        events.forEach(ev => {
          logger.info('Client wf event', { ...ev, userId });
        });
      } else if (eventType) {
        logger.info('Client wf event', { eventType, metadata, userId });
      }
      res.status(200).json(success({ logged: true }));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = sessionController;
