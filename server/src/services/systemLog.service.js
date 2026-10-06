/**
 * PBLMS — System Logs Service (Database-backed)
 *
 * Queries the Application_Log table for the System Logs UI.
 * File-based Winston log parsing has been removed as the primary source.
 * Winston continues to write to logs/app.log and logs/error.log in parallel.
 */

const pool = require('../config/database');

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const systemLogService = {
  /**
   * Get paginated system logs with optional filters.
   */
  async getLogs({ level, module, action, fromDate, toDate, search, page = 1, pageSize = 25 }) {
    if (!page || page < 1) page = 1;
    if (!PAGE_SIZE_OPTIONS.includes(pageSize)) pageSize = 25;

    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];

    if (level) { where.push('al.Level = ?'); params.push(level.toUpperCase()); }
    if (module) {
      const modules = module.split(',').map(m => m.trim()).filter(Boolean);
      if (modules.length === 1) {
        where.push('al.Module = ?'); params.push(modules[0]);
      } else if (modules.length > 1) {
        const placeholders = modules.map(() => '?').join(',');
        where.push(`al.Module IN (${placeholders})`);
        params.push(...modules);
      }
    }
    if (action) { where.push('al.Action = ?'); params.push(action); }
    if (fromDate) { where.push('al.Timestamp >= ?'); params.push(fromDate); }
    if (toDate) { where.push('al.Timestamp <= ?'); params.push(toDate + ' 23:59:59.999'); }
    if (search) {
      where.push('(al.Message LIKE ? OR al.Request_ID LIKE ? OR al.API_Path LIKE ? OR al.Exception LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Count
    const countSql = `SELECT COUNT(*) AS cnt FROM Application_Log al ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const totalCount = countRows[0]?.cnt || 0;

    // Data
    const dataSql = `
      SELECT
        al.Log_ID,
        al.Timestamp,
        al.Level,
        al.Module,
        al.Action,
        al.User_ID,
        al.Username,
        al.Request_ID,
        al.Session_ID,
        al.IP_Address,
        al.User_Agent,
        al.HTTP_Method,
        al.API_Path,
        al.Status_Code,
        al.Duration_ms,
        al.Message,
        al.Exception,
        al.Stack_Trace,
        al.Metadata_JSON,
        al.Created_On
      FROM Application_Log al
      ${whereClause}
      ORDER BY al.Timestamp DESC
      LIMIT ? OFFSET ?`;

    const dataParams = [...params, pageSize, offset];
    const [rows] = await pool.query(dataSql, dataParams);

    return { rows, totalCount, page, pageSize };
  },

  /**
   * Download logs as plain text.
   */
  async downloadLogs({ level, module, fromDate, toDate }) {
    const result = await this.getLogs({ level, module, fromDate, toDate, page: 1, pageSize: 10000 });
    return result.rows.map(e =>
      `[${e.Level}] ${e.Timestamp} [${e.Module}] ${e.Action || ''} — ${e.Message || ''} (${e.Request_ID || 'N/A'})`
    ).join('\n');
  },

  /**
   * Get distinct modules for filter dropdown.
   */
  async getDistinctModules() {
    const [rows] = await pool.query(
      'SELECT DISTINCT Module FROM Application_Log WHERE Module IS NOT NULL ORDER BY Module'
    );
    return rows.map(r => r.Module);
  },

  /**
   * Get distinct actions for filter dropdown.
   */
  async getDistinctActions() {
    const [rows] = await pool.query(
      'SELECT DISTINCT Action FROM Application_Log WHERE Action IS NOT NULL ORDER BY Action'
    );
    return rows.map(r => r.Action);
  },

  /**
   * Get distinct levels for filter dropdown.
   */
  async getDistinctLevels() {
    const [rows] = await pool.query(
      'SELECT DISTINCT Level FROM Application_Log ORDER BY FIELD(Level, "ERROR", "WARN", "INFO", "DEBUG")'
    );
    return rows.map(r => r.Level);
  },
};

module.exports = systemLogService;