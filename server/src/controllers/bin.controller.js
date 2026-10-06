const { validationResult } = require('express-validator');
const binService = require('../services/bin.service');
const { success } = require('../utils/responseBuilder');
const applicationLogService = require('../services/applicationLog.service');

const binController = {
  async listBins(req, res, next) {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.binTypeId) filters.binTypeId = parseInt(req.query.binTypeId);
      if (req.query.binCategoryId) filters.binCategoryId = parseInt(req.query.binCategoryId);
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true' ? 1 : 0;
      if (req.query.bayId) filters.bayId = parseInt(req.query.bayId);
      if (req.query.search) filters.search = req.query.search;
      const rows = await binService.listBins(filters);
      res.json(success(rows));
    } catch (e) { next(e); }
  },
  async getBin(req, res, next) {
    try {
      const bin = await binService.getBin(parseInt(req.params.binId));
      res.json(success(bin));
    } catch (e) { next(e); }
  },
  async registerBin(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      const result = await binService.registerBin(req.body, req.user.userId);
      applicationLogService.logCrud({
        action: 'REGISTER_BIN', entity: 'Bin', entityId: result.Bin_Number,
        userId: req.user.userId, username: req.user.fullName, requestId: req.requestId,
        metadata: { binId: result.Bin_ID, binCode: result.Bin_Code },
      });
      res.status(201).json(success(result));
    } catch (e) { next(e); }
  },
  async updateBin(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      const binId = parseInt(req.params.binId);
      await binService.updateBin(binId, req.body, req.user.userId);
      applicationLogService.logCrud({
        action: 'UPDATE_BIN', entity: 'Bin', entityId: String(binId),
        userId: req.user.userId, username: req.user.fullName, requestId: req.requestId,
      });
      res.json(success(null));
    } catch (e) { next(e); }
  },
  async deactivateBin(req, res, next) {
    try {
      const binId = parseInt(req.params.binId);
      await binService.deactivateBin(binId, req.user.userId);
      applicationLogService.logCrud({
        action: 'DEACTIVATE_BIN', entity: 'Bin', entityId: String(binId),
        userId: req.user.userId, username: req.user.fullName, requestId: req.requestId,
      });
      res.json(success(null));
    } catch (e) { next(e); }
  },
  async scanBin(req, res, next) {
    try {
      const { qrCode } = req.params;
      const { userId } = req.user;
      if (!qrCode) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'QR code is required' } });
      const bin = await binService.scanBin(qrCode, userId);
      res.json(success(bin));
    } catch (e) { next(e); }
  },
  async getCurrentLoading(req, res, next) {
    try {
      const { binId } = req.params;
      const loading = await binService.getCurrentLoading(parseInt(binId));
      res.json(success(loading));
    } catch (e) { next(e); }
  },
  async getBinByCode(req, res, next) {
    try {
      const { binCode } = req.params;
      const bin = await binService.getBinByCode(binCode);
      res.json(success(bin));
    } catch (e) { next(e); }
  },
  async getBinQr(req, res, next) {
    try {
      const { binCode } = req.params;
      const bin = await binService.getBinByCode(binCode);
      if (!bin.QR_Image) throw new Error('QR image not found');
      const absolutePath = require('path').join(__dirname, '..', '..', 'uploads', 'bin_qr', `${binCode}.png`);
      res.sendFile(absolutePath);
    } catch (e) { next(e); }
  },
  async regenerateQr(req, res, next) {
    try {
      const result = await binService.regenerateQr(parseInt(req.params.binId));
      applicationLogService.logCrud({
        action: 'REGENERATE_QR', entity: 'Bin', entityId: result.Bin_Code,
        userId: req.user.userId, username: req.user.fullName, requestId: req.requestId,
      });
      res.json(success(result));
    } catch (e) { next(e); }
  },
};

module.exports = binController;
