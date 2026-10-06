const { validationResult } = require('express-validator');
const userService = require('../services/user.service');
const { success } = require('../utils/responseBuilder');

const userController = {
  async listUsers(req, res, next) {
    try {
      const { search, role, status, sortBy, sortOrder, page, pageSize } = req.query;
      const result = await userService.listUsers({
        search: search || null,
        role: role || null,
        status: status || null,
        sortBy: sortBy || null,
        sortOrder: sortOrder || null,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 25,
      });
      res.json(success(result));
    } catch (e) { next(e); }
  },

  async getUserById(req, res, next) {
    try {
      const result = await userService.getUserById(parseInt(req.params.userId, 10));
      res.json(success(result));
    } catch (e) { next(e); }
  },

  async createUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      }
      const result = await userService.createUser(req.body, req.user.userId, req.ip, req.headers['user-agent']);
      res.status(201).json(success(result));
    } catch (e) { next(e); }
  },

  async updateUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: errors.array() } });
      }
      const result = await userService.updateUser(parseInt(req.params.userId, 10), req.body, req.user.userId, req.ip, req.headers['user-agent']);
      res.json(success(result));
    } catch (e) { next(e); }
  },

  async deactivateUser(req, res, next) {
    try {
      await userService.deactivateUser(parseInt(req.params.userId, 10), req.user.userId, req.ip, req.headers['user-agent']);
      res.json(success(null));
    } catch (e) { next(e); }
  },

  async activateUser(req, res, next) {
    try {
      await userService.activateUser(parseInt(req.params.userId, 10), req.user.userId, req.ip, req.headers['user-agent']);
      res.json(success(null));
    } catch (e) { next(e); }
  },

  async resetPassword(req, res, next) {
    try {
      const result = await userService.resetPassword(parseInt(req.params.userId, 10), req.user.userId, req.ip, req.headers['user-agent']);
      res.json(success(result));
    } catch (e) { next(e); }
  },

  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(parseInt(req.params.userId, 10), req.user.userId, req.ip, req.headers['user-agent']);
      res.json(success(null));
    } catch (e) { next(e); }
  },

  async getRoles(req, res, next) {
    try {
      const roles = await userService.getRoleOptions();
      res.json(success(roles));
    } catch (e) { next(e); }
  },
};

module.exports = userController;
