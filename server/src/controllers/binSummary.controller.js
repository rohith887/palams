const binSummaryService = require('../services/binSummary.service');
const { success } = require('../utils/responseBuilder');

const binSummaryController = {
  async getSummary(req, res, next) {
    try {
      const {
        search, status, bayId, tankId, materialId,
        fromDate, toDate, page, pageSize, sortColumn, sortOrder,
      } = req.query;

      const result = await binSummaryService.getSummary({
        search, status,
        bayId: bayId ? Number(bayId) : undefined,
        tankId: tankId ? Number(tankId) : undefined,
        materialId: materialId ? Number(materialId) : undefined,
        fromDate, toDate,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        sortColumn, sortOrder,
      });

      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = binSummaryController;
