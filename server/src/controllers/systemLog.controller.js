const systemLogService = require('../services/systemLog.service');
const { success } = require('../utils/responseBuilder');

const systemLogController = {
  async getLogs(req, res, next) {
    try {
      const { level, module, action, fromDate, toDate, search, page, pageSize } = req.query;
      const result = await systemLogService.getLogs({
        level: level || null,
        module: module || null,
        action: action || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        search: search || null,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 25,
      });
      res.status(200).json(success(result));
    } catch (err) { next(err); }
  },

  async downloadLogs(req, res, next) {
    try {
      const { level, module, fromDate, toDate } = req.query;
      const content = await systemLogService.downloadLogs({ level, module, fromDate, toDate });
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=system-logs.txt');
      res.send(content);
    } catch (err) { next(err); }
  },

  async getModules(req, res, next) {
    try {
      const modules = await systemLogService.getDistinctModules();
      res.status(200).json(success(modules));
    } catch (err) { next(err); }
  },

  async getActions(req, res, next) {
    try {
      const actions = await systemLogService.getDistinctActions();
      res.status(200).json(success(actions));
    } catch (err) { next(err); }
  },

  async getLevels(req, res, next) {
    try {
      const levels = await systemLogService.getDistinctLevels();
      res.status(200).json(success(levels));
    } catch (err) { next(err); }
  },
};

module.exports = systemLogController;
