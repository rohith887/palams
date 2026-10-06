const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/responseBuilder');

const dashboardController = {
  async getMetrics(req, res, next) {
    try {
      const { role } = req.user;
      const metrics = await dashboardService.getMetrics(role);
      res.status(200).json(success(metrics));
    } catch (err) {
      next(err);
    }
  },

  async getAdminDashboard(req, res, next) {
    try {
      const data = await dashboardService.getAdminDashboard();
      res.status(200).json(success(data));
    } catch (err) {
      next(err);
    }
  },

  async getOperatorPerformance(req, res, next) {
    try {
      const performance = await dashboardService.getOperatorPerformance();
      res.status(200).json(success(performance));
    } catch (err) {
      next(err);
    }
  },

  async getOperatorDashboard(req, res, next) {
    try {
      const { userId, role } = req.user;
      const data = await dashboardService.getOperatorDashboard(userId, role);
      res.status(200).json(success(data));
    } catch (err) {
      next(err);
    }
  },

  async getLiveOperations(req, res, next) {
    try {
      const ops = await dashboardService.getLiveOperations();
      res.status(200).json(success(ops));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
