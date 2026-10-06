const pool = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const SESSION_TIMEOUT_MINUTES = 30;

const sessionService = {
  async createSession({ binId, userId, operationType, qrCodeValue }) {
    const [result] = await pool.execute(
      `INSERT INTO Operation_Session (Bin_ID, User_ID, Operation_Type, Session_Status, QR_Code_Value, Expires_At)
       VALUES (?, ?, ?, 'CREATED', ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [binId, userId, operationType, qrCodeValue || null, SESSION_TIMEOUT_MINUTES],
    );
    return { sessionId: result.insertId };
  },

  async updateSessionStatus(sessionId, status, metadata = null) {
    if (metadata) {
      await pool.execute(
        'UPDATE Operation_Session SET Session_Status = ?, Metadata = ? WHERE Session_ID = ?',
        [status, JSON.stringify(metadata), sessionId],
      );
    } else {
      await pool.execute(
        'UPDATE Operation_Session SET Session_Status = ? WHERE Session_ID = ?',
        [status, sessionId],
      );
    }
  },

  async heartbeat(sessionId) {
    if (!sessionId) return;
    await pool.execute(
      `UPDATE Operation_Session
       SET Expires_At = DATE_ADD(NOW(), INTERVAL ? MINUTE),
           Updated_At = NOW()
       WHERE Session_ID = ? AND Session_Status IN ('CREATED', 'SCANNED', 'IN_PROGRESS')`,
      [SESSION_TIMEOUT_MINUTES, sessionId],
    );
  },

  async releaseExpiredLocks() {
    const [result] = await pool.execute(
      `DELETE FROM Lock_Table WHERE Expires_At IS NOT NULL AND Expires_At < NOW()`,
    );
    if (result.affectedRows > 0) {
      logger.info('Released expired locks', { count: result.affectedRows });
    }
    return result.affectedRows;
  },

  async getSessionById(sessionId) {
    const [rows] = await pool.execute(
      `SELECT s.*, u.Full_Name AS Operator_Name, b.Bin_Number
       FROM Operation_Session s
       LEFT JOIN User_Master u ON u.User_ID = s.User_ID
       LEFT JOIN Bin_Master b ON b.Bin_ID = s.Bin_ID
       WHERE s.Session_ID = ?`,
      [sessionId],
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async getSession(binId, userId) {
    const [rows] = await pool.execute(
      `SELECT * FROM Operation_Session
       WHERE Bin_ID = ? AND User_ID = ?
       ORDER BY Created_At DESC
       LIMIT 1`,
      [binId, userId],
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async getActiveSessionByBin(binId) {
    const [rows] = await pool.execute(
      `SELECT s.*, u.Full_Name AS Operator_Name
       FROM Operation_Session s
       LEFT JOIN User_Master u ON u.User_ID = s.User_ID
       WHERE s.Bin_ID = ? AND s.Session_Status IN ('CREATED', 'SCANNED', 'IN_PROGRESS')
       ORDER BY s.Created_At DESC
       LIMIT 1`,
      [binId],
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async expireStaleSessions() {
    const [result] = await pool.execute(
      `UPDATE Operation_Session
       SET Session_Status = 'EXPIRED'
       WHERE Session_Status IN ('CREATED', 'SCANNED', 'IN_PROGRESS')
         AND Expires_At IS NOT NULL
         AND Expires_At < NOW()`,
    );
    if (result.affectedRows > 0) {
      logger.info('Expired stale sessions', { count: result.affectedRows });
    }
    return result.affectedRows;
  },

  async checkScanRecovery({ binId, userId, qrCodeValue }) {
    await this.releaseExpiredLocks();
    await this.expireStaleSessions();

    const existing = await this.getSession(binId, userId);
    if (existing) {
      if (existing.Session_Status === 'COMPLETED') {
        return {
          action: 'ALREADY_COMPLETED',
          message: 'Operation already completed.',
          sessionId: existing.Session_ID,
          session: existing,
        };
      }
      if (existing.Session_Status === 'CANCELLED' || existing.Session_Status === 'EXPIRED') {
        const sessionId = (await this.createSession({ binId, userId, operationType: existing.Operation_Type, qrCodeValue })).sessionId;
        await this.updateSessionStatus(sessionId, 'SCANNED');
        return { action: 'NEW', sessionId, message: null };
      }
      return {
        action: 'RESUME',
        message: null,
        sessionId: existing.Session_ID,
        session: existing,
      };
    }

    const activeByOther = await this.getActiveSessionByBin(binId);
    if (activeByOther && activeByOther.User_ID !== userId) {
      return {
        action: 'BLOCKED',
        message: `This bin is currently being processed by ${activeByOther.Operator_Name || 'another operator'}.`,
        sessionId: null,
        session: activeByOther,
      };
    }

    const sessionId = (await this.createSession({ binId, userId, operationType: 'UNKNOWN', qrCodeValue })).sessionId;
    await this.updateSessionStatus(sessionId, 'SCANNED');
    return { action: 'NEW', sessionId, message: null };
  },

  async cancelSession(sessionId) {
    await this.updateSessionStatus(sessionId, 'CANCELLED');
  },

};

module.exports = sessionService;
