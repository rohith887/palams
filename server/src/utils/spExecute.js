const pool = require('../config/database');
const logger = require('./logger');

/**
 * Execute a MySQL stored procedure using session variables for OUT parameters
 * and return a normalized response.
 *
 * @param {string} spName
 * @param {Array} params — Ordered array of IN parameter values
 * @returns {Promise<{ success: boolean, errorCode: string|null, errorMessage: string|null, data: any[]|null }>}
 */
async function spExecute(spName, params = []) {
  const startTime = Date.now();
  let connection;

  try {
    const OUT_VARS = ['@_p_success', '@_p_error_code', '@_p_error_message'];

    const inPlaceholders = params.map(() => '?').join(', ');
    const outPlaceholders = OUT_VARS.join(', ');
    const allPlaceholders = inPlaceholders
      ? `${inPlaceholders}, ${outPlaceholders}`
      : outPlaceholders;
    const callSql = `CALL ${spName}(${allPlaceholders})`;

    logger.debug('Executing stored procedure', { spName, paramCount: params.length });

    connection = await pool.getConnection();

    // Step 1: Execute CALL — captures SELECT result sets AND OUT params via session variables
    const [results] = await connection.query(callSql, params);

    // Step 2: Read OUT parameter values from session variables
    const [outRows] = await connection.query(
      `SELECT ${OUT_VARS[0]} AS p_success, ${OUT_VARS[1]} AS p_error_code, ${OUT_VARS[2]} AS p_error_message`,
    );

    const outputParams = outRows && outRows.length > 0 ? outRows[0] : null;
    const durationMs = Date.now() - startTime;

    if (!outputParams) {
      logger.warn('Stored procedure returned no output parameters', {
        spName, durationMs, paramCount: params.length,
      });
      return { success: false, errorCode: 'SP_NO_OUTPUT',
        errorMessage: `Stored procedure ${spName} returned no output parameters`, data: null };
    }

    const rawSuccess = outputParams.p_success;
    const p_success =
      rawSuccess === 1 || rawSuccess === true || rawSuccess === '1';
    const p_error_code = outputParams.p_error_code || null;
    const p_error_message = outputParams.p_error_message || null;

    // Extract SELECT result sets from the CALL results
    // results is an array where each element is an array of rows (or OkPacket)
    // Keep all Array results (including empty SELECTs) so positional indexing
    // is stable for multi-result-set procedures. OkPackets are objects, not arrays.
    const dataSets = Array.isArray(results)
      ? results.filter((r) => Array.isArray(r))
      : [];

    if (p_success) {
      logger.info('Stored procedure executed successfully', { spName, durationMs, paramCount: params.length, resultSetCount: dataSets.length });
    } else {
      logger.warn('Stored procedure returned error', { spName, durationMs, errorCode: p_error_code, errorMessage: p_error_message });
    }

    return { success: p_success, errorCode: p_error_code, errorMessage: p_error_message, data: dataSets.length > 0 ? dataSets : null };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error('Stored procedure execution failed', { spName, durationMs, error: err.message, code: err.code, errno: err.errno, sqlState: err.sqlState });

    if (err.code === 'ER_SP_DOES_NOT_EXIST') {
      return { success: false, errorCode: 'SP_NOT_FOUND', errorMessage: `Stored procedure ${spName} does not exist`, data: null };
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      return { success: false, errorCode: 'DB_ACCESS_DENIED', errorMessage: 'Database access denied.', data: null };
    }
    if (err.code === 'ER_NO_DB_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
      return { success: false, errorCode: 'DB_UNAVAILABLE', errorMessage: 'Database is not available', data: null };
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      return { success: false, errorCode: 'DB_CONNECTION_ERROR', errorMessage: 'Unable to connect to database', data: null };
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return { success: false, errorCode: 'DUPLICATE_ENTRY', errorMessage: 'A record with the same unique value already exists', data: null };
    }
    return { success: false, errorCode: 'INTERNAL_DB_ERROR', errorMessage: 'An internal database error occurred', data: null };
  } finally {
    if (connection) {
      try { connection.release(); } catch (releaseErr) { logger.error('Failed to release connection', { error: releaseErr.message }); }
    }
  }
}

module.exports = spExecute;