const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { success } = require('../utils/responseBuilder');
const AppError = require('../utils/AppError');
const applicationLogService = require('../services/applicationLog.service');

const authController = {
  async login(req, res, next) {
    const username = req.body?.username || 'unknown';
    const requestId = req.requestId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent') || '';
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        applicationLogService.logAuth({
          action: 'LOGIN', username, success: false, requestId, ipAddress, userAgent,
          metadata: { reason: 'VALIDATION_ERROR' },
        });
        const err = new AppError(400, 'VALIDATION_ERROR', 'Validation failed');
        err.errors = errors.array();
        throw err;
      }
      const { password } = req.body;
      const result = await authService.login(username, password, ipAddress, userAgent);

      applicationLogService.logAuth({
        action: 'LOGIN',
        userId: result.user?.userId,
        username: result.user?.fullName || username,
        success: true,
        requestId,
        ipAddress,
        userAgent,
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });
      res.status(200).json(success({ accessToken: result.accessToken, user: result.user }));
    } catch (err) {
      if (err.statusCode !== 400) {
        applicationLogService.logAuth({
          action: 'LOGIN', username, success: false, requestId, ipAddress, userAgent,
          metadata: { error: err.message },
        });
      }
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const tokenHash = req.cookies?.refreshToken;
      if (!tokenHash) throw new AppError(401, 'AUTH_UNAUTHORIZED', 'No refresh token provided');
      const result = await authService.refresh(tokenHash);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000, path: '/api/v1/auth',
      });
      res.status(200).json(success({ accessToken: result.accessToken }));
    } catch (err) { next(err); }
  },

  async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      const username = req.user.fullName || req.user.username || null;
      const tokenHash = req.cookies?.refreshToken;
      if (tokenHash) await authService.logout(userId, tokenHash);

      applicationLogService.logAuth({
        action: 'LOGOUT',
        userId,
        username,
        success: true,
        requestId: req.requestId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || '',
      });

      res.clearCookie('refreshToken', { path: '/api/v1/auth' });
      res.status(200).json(success({ message: 'Logged out successfully' }));
    } catch (err) { next(err); }
  },
};

module.exports = authController;