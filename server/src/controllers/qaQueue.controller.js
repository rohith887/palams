const qaQueueService = require('../services/qaQueue.service');
const { success } = require('../utils/responseBuilder');

const qaQueueController = {
  async getQueue(req, res, next) {
    try {
      const {
        materialId, bayId, priority,
        fromDate, toDate, search,
        sortBy, sortOrder, page, pageSize,
      } = req.query;

      const data = await qaQueueService.getQueue({
        materialId: materialId || null,
        bayId: bayId || null,
        priority: priority || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        search: search || null,
        sortBy: sortBy || 'oldest',
        sortOrder: sortOrder || 'ASC',
        page: parseInt(page, 10) || 1,
        pageSize: parseInt(pageSize, 10) || 25,
      });

      res.status(200).json(success(data));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = qaQueueController;
