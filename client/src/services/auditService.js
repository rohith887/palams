import axiosInstance from '../utils/axiosInstance';

/**
 * auditService — Audit Trail and Bin History API calls
 * All audit-related reads go through this service exclusively.
 */
const auditService = {
  /**
   * Get paginated audit history with optional filters.
   * @param {Object} params
   * @param {string} params.entityType - 'bin_history' or 'audit_log'
   * @param {string} [params.binId]
   * @param {string} [params.userId]
   * @param {string} [params.actionType]
   * @param {string} [params.fromDate]
   * @param {string} [params.toDate]
   * @param {number} [params.page]
   * @param {number} [params.pageSize]
   */
  getAuditHistory: (params = {}) =>
    axiosInstance.get('/v1/audit/history', { params }),

  /**
   * Get paginated Audit Log entries with optional filters.
   * @param {Object} params
   * @param {string} [params.actorId]       - User ID of the actor
   * @param {string} [params.actionType]    - Action type string
   * @param {string} [params.targetEntity]  - Target entity name
   * @param {string} [params.fromDate]      - ISO date string
   * @param {string} [params.toDate]        - ISO date string
   * @param {number} [params.page]          - 1-based page number
   * @param {number} [params.pageSize]      - Rows per page (25|50|100)
   */
  getAuditLog: (params = {}) =>
    axiosInstance.get('/v1/audit/log', { params }),

  /**
   * Get Bin History records for a specific bin identified by bin number.
   * @param {string} binNumber - The bin number to look up
   */
  getBinHistory: (binNumber) =>
    axiosInstance.get('/v1/audit/bin-history', { params: { binNumber } }),

  /**
   * Get distinct action types for the filter dropdown.
   */
  getActionTypes: () =>
    axiosInstance.get('/v1/audit/action-types'),

  /**
   * Get distinct actors (users) for the filter dropdown.
   */
  getActors: () =>
    axiosInstance.get('/v1/audit/actors'),
};

export default auditService;
