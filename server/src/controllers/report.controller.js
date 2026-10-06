const reportService = require('../services/report.service');
const { success } = require('../utils/responseBuilder');

const reportController = {
  async generateReport(req, res, next) {
    try {
      const {
        reportType, fromDate, toDate, binNumber, operatorId, bayId, materialId,
        page, pageSize, status, tankId, search, sortColumn, sortOrder,
      } = req.body;

      const result = await reportService.generateReport({
        reportType, fromDate, toDate, binNumber, operatorId, bayId, materialId,
        page, pageSize, status, tankId, search, sortColumn, sortOrder,
      });

      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async getExceptions(req, res, next) {
    try {
      const result = await reportService.getExceptions();
      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = reportController;