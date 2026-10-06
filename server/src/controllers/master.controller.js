const { validationResult } = require('express-validator');
const masterService = require('../services/master.service');
const { success } = require('../utils/responseBuilder');

const masterController = {
  // Bays
  async listBays(req, res, next) {
    try {
      const activeOnly = req.query.all !== 'true';
      const rows = await masterService.listBays(activeOnly);
      res.json(success(rows));
    } catch (e) { next(e); }
  },
  async createBay(req, res, next) {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      const result = await masterService.createBay(req.body, req.user.userId);
      res.status(201).json(success(result));
    } catch (e) { next(e); }
  },
  async updateBay(req, res, next) {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      await masterService.updateBay(parseInt(req.params.bayId), req.body, req.user.userId);
      res.json(success(null));
    } catch (e) { next(e); }
  },
  async deactivateBay(req, res, next) {
    try {
      await masterService.deactivateBay(parseInt(req.params.bayId), req.user.userId);
      res.json(success(null));
    } catch (e) { next(e); }
  },

  // Tanks
  async listTanks(req, res, next) {
    try {
      const bayId = req.query.bayId ? parseInt(req.query.bayId) : null;
      const rows = await masterService.listTanks(bayId);
      res.json(success(rows));
    } catch (e) { next(e); }
  },
  async createTank(req, res, next) {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      const result = await masterService.createTank(req.body, req.user.userId);
      res.status(201).json(success(result));
    } catch (e) { next(e); }
  },
  async updateTank(req, res, next) {
    try {
      await masterService.updateTank(parseInt(req.params.tankId), req.body, req.user.userId);
      res.json(success(null));
    } catch (e) { next(e); }
  },
  async deactivateTank(req, res, next) {
    try {
      await masterService.deactivateTank(parseInt(req.params.tankId), req.user.userId);
      res.json(success(null));
    } catch (e) { next(e); }
  },

  // Materials
  async listMaterials(req, res, next) {
    try {
      const activeOnly = req.query.all !== 'true';
      const rows = await masterService.listMaterials(activeOnly);
      res.json(success(rows));
    } catch (e) { next(e); }
  },
  async createMaterial(req, res, next) {
    try {
      const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      const result = await masterService.createMaterial(req.body, req.user.userId);
      res.status(201).json(success(result));
    } catch (e) { next(e); }
  },
  async updateMaterial(req, res, next) {
    try {
      await masterService.updateMaterial(parseInt(req.params.materialId), req.body, req.user.userId);
      res.json(success(null));
    } catch (e) { next(e); }
  },
  async deactivateMaterial(req, res, next) {
    try {
      await masterService.deactivateMaterial(parseInt(req.params.materialId), req.user.userId);
      res.json(success(null));
    } catch (e) { next(e); }
  },

  // Lookups
  async listBinTypes(req, res, next) {
    try { const rows = await masterService.listBinTypes(); res.json(success(rows)); } catch (e) { next(e); }
  },
  async listBinCategories(req, res, next) {
    try { const rows = await masterService.listBinCategories(); res.json(success(rows)); } catch (e) { next(e); }
  },
};

module.exports = masterController;