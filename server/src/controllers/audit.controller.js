const auditService = require('../services/audit.service');
const { success } = require('../utils/responseBuilder');

const auditController = {
  async getAuditHistory(req, res, next) {
    try {
      const { entityType, binId, userId, actionType, fromDate, toDate, page, pageSize } = req.query;

      const result = await auditService.getAuditHistory({
        entityType,
        binId: binId ? parseInt(binId, 10) : null,
        userId: userId ? parseInt(userId, 10) : null,
        actionType: actionType || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 25,
      });

      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async getAuditLog(req, res, next) {
    try {
      const { actorId, actionType, targetEntity, targetId, fromDate, toDate, page, pageSize } = req.query;

      const result = await auditService.getAuditLog({
        actorId: actorId ? parseInt(actorId, 10) : null,
        actionType: actionType || null,
        targetEntity: targetEntity || null,
        targetId: targetId ? parseInt(targetId, 10) : null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 25,
      });

      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async getBinHistory(req, res, next) {
    try {
      const { binNumber } = req.query;
      // Use the new lifecycle timeline endpoint (built from operational records)
      const result = await auditService.getBinLifecycleTimeline(binNumber);
      res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  },

  async getActionTypes(req, res, next) {
    try {
      const types = await auditService.getDistinctActionTypes();
      res.status(200).json(success(types));
    } catch (err) {
      next(err);
    }
  },

  async getActors(req, res, next) {
    try {
      const actors = await auditService.getDistinctActors();
      res.status(200).json(success(actors));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = auditController;