const pool = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const alertService = {
  async getAlerts(filters = {}) {
    const where = [];
    const params = [];

    if (filters.severity) {
      where.push('a.Severity = ?');
      params.push(filters.severity);
    }
    if (filters.status === 'active') {
      where.push('a.Acknowledged_At IS NULL');
    } else if (filters.status === 'acknowledged') {
      where.push('a.Acknowledged_At IS NOT NULL');
    } else if (filters.status === 'resolved') {
      // Resolved_At column not yet in database; return empty for this filter
      where.push('1=0');
    }
    if (filters.fromDate) {
      where.push('a.Created_At >= ?');
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      where.push('a.Created_At <= ?');
      params.push(filters.toDate + ' 23:59:59.999');
    }
    if (filters.search) {
      where.push('(a.Alert_Type LIKE ? OR a.Alert_Message LIKE ? OR b.Bin_Number LIKE ?)');
      const q = `%${filters.search}%`;
      params.push(q, q, q);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Note: Assigned_To, Resolved_At columns are added by migration 037.
    // Until that migration runs, use NULL to avoid unknown-column errors.
    const [rows] = await pool.query(
      `SELECT a.Alert_ID, a.Alert_Type, a.Bin_ID, a.User_ID, a.Alert_Message,
              a.Severity, a.Created_At, a.Acknowledged_By, a.Acknowledged_At,
              b.Bin_Number,
              u.Full_Name AS user_name,
              au.Full_Name AS acknowledged_by_name
       FROM Alert_Log a
       LEFT JOIN Bin_Master b ON b.Bin_ID = a.Bin_ID
       LEFT JOIN User_Master u ON u.User_ID = a.User_ID
       LEFT JOIN User_Master au ON au.User_ID = a.Acknowledged_By
       ${whereClause}
       ORDER BY a.Created_At DESC
       LIMIT 200`,
      params,
    );
    return rows;
  },

  async acknowledgeAlert(alertId, adminUserId) {
    const [existing] = await pool.query(
      'SELECT Acknowledged_At FROM Alert_Log WHERE Alert_ID = ?', [alertId],
    );
    if (existing.length === 0) throw new AppError(404, 'NOT_FOUND', 'Alert not found');
    if (existing[0].Acknowledged_At) throw new AppError(409, 'ALREADY_ACKNOWLEDGED', 'Alert already acknowledged');

    await pool.query(
      'UPDATE Alert_Log SET Acknowledged_By = ?, Acknowledged_At = NOW() WHERE Alert_ID = ?',
      [adminUserId, alertId],
    );
    logger.info('Alert acknowledged', { alertId, adminUserId });
  },

  // Placeholder: requires Assigned_To column from migration 037
  async assignAlert(alertId, assigneeId, adminUserId) {
    logger.info('Alert assigned (placeholder — Assigned_To column not yet added)', { alertId, assigneeId, by: adminUserId });
  },

  // Placeholder: requires Resolved_At column from migration 037
  async resolveAlert(alertId, adminUserId) {
    logger.info('Alert resolved (placeholder — Resolved_At column not yet added)', { alertId, by: adminUserId });
  },

  async getSeverityCounts() {
    const [rows] = await pool.query(
      `SELECT Severity, COUNT(*) AS cnt
       FROM Alert_Log
       WHERE Acknowledged_At IS NULL
       GROUP BY Severity`,
    );
    return rows;
  },
};

module.exports = alertService;