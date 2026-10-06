const qaDashboardService = require('../services/qaDashboard.service');
const { success } = require('../utils/responseBuilder');

const qaDashboardController = {
  async getDashboard(req, res, next) {
    try {
      const { userId } = req.user;
      const data = await qaDashboardService.getDashboard(userId);
      res.status(200).json(success(data));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = qaDashboardController;
