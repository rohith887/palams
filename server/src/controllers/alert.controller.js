const alertService = require('../services/alert.service');
const { success } = require('../utils/responseBuilder');

const alertController = {
  async getAlerts(req, res, next) {
    try {
      const { severity, status, fromDate, toDate, search } = req.query;
      const alerts = await alertService.getAlerts({ severity, status, fromDate, toDate, search });
      res.status(200).json(success(alerts));
    } catch (err) {
      next(err);
    }
  },

  async acknowledgeAlert(req, res, next) {
    try {
      const alertId = parseInt(req.params.alertId, 10);
      const adminUserId = req.user.userId;
      await alertService.acknowledgeAlert(alertId, adminUserId);
      res.status(200).json(success({ message: 'Alert acknowledged' }));
    } catch (err) {
      next(err);
    }
  },

  async assignAlert(req, res, next) {
    try {
      const alertId = parseInt(req.params.alertId, 10);
      const { assigneeId } = req.body;
      const adminUserId = req.user.userId;
      await alertService.assignAlert(alertId, assigneeId || null, adminUserId);
      res.status(200).json(success({ message: 'Alert assigned' }));
    } catch (err) {
      next(err);
    }
  },

  async resolveAlert(req, res, next) {
    try {
      const alertId = parseInt(req.params.alertId, 10);
      const adminUserId = req.user.userId;
      await alertService.resolveAlert(alertId, adminUserId);
      res.status(200).json(success({ message: 'Alert resolved' }));
    } catch (err) {
      next(err);
    }
  },

  async getSeverityCounts(req, res, next) {
    try {
      const counts = await alertService.getSeverityCounts();
      res.status(200).json(success(counts));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = alertController;