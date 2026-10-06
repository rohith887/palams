const spExecute = require('../utils/spExecute');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const dashboardService = {
  async getMetrics(userRole) {
    if (!userRole) throw new AppError(400, 'VALIDATION_ERROR', 'User role is required');

    logger.debug('Dashboard service: fetching metrics', { userRole });

    const spResult = await spExecute('sp_generate_dashboard_metrics', [userRole]);
    if (!spResult.success) throw new AppError(500, spResult.errorCode, spResult.errorMessage);

    const metrics = spResult.data?.[0]?.[0] || {};
    return metrics;
  },

  async getOperatorPerformance() {
    logger.debug('Dashboard service: fetching operator performance');
    const spResult = await spExecute('sp_get_operator_performance_today', []);
    if (!spResult.success) throw new AppError(500, spResult.errorCode, spResult.errorMessage);
    return spResult.data?.[0] || [];
  },

  async getAdminDashboard() {
    logger.debug('Dashboard service: fetching aggregated admin dashboard');

    // Run focused SPs in parallel — each does one job, no duplication
    const [kpiResult, chartsResult, perfResult, activityResult, alertsResult] =
      await Promise.all([
        spExecute('sp_get_admin_kpis',                []),
        spExecute('sp_get_admin_chart_data',           []),
        spExecute('sp_get_operator_performance_today', []),  // reused SP (now includes Avg_Minutes)
        spExecute('sp_get_admin_recent_activity',      []),
        spExecute('sp_get_active_alerts_summary',      []),
      ]);

    if (!kpiResult.success) {
      logger.error('sp_get_admin_kpis failed', { code: kpiResult.errorCode });
    }

    // With spExecute preserving empty result sets (OkPackets filtered, empty arrays kept),
    // positional indexing is now stable. data[0] = daily ops, data[1] = QA results.
    const chartData = chartsResult.data || [];
    const dailyOps  = chartData[0] || [];
    const qaResults = chartData[1] || [];

    return {
      kpis:               kpiResult.data?.[0]?.[0] || {},
      charts: {
        dailyOps,    // [{op_date, loading_count, unloading_count, cleaning_count, qa_count}]
        qaResults,   // [{qa_date, pass_count, fail_count, total_count, pass_rate}]
      },
      operatorPerformance: perfResult.data?.[0]     || [],
      recentActivity:      activityResult.data?.[0] || [],
      alerts:              alertsResult.data?.[0]   || [],
      liveOperations:      [],  // Will be populated by getLiveOperations
    };
  },

  async getLiveOperations() {
    logger.debug('Dashboard service: fetching live operations');
    const spResult = await spExecute('sp_get_live_operations', []);
    if (!spResult.success) {
      logger.warn('sp_get_live_operations returned no data', { code: spResult.errorCode });
      return [];
    }
    return spResult.data?.[0] || [];
  },

  async getOperatorDashboard(userId, userRole) {
    if (!userId || !userRole) throw new AppError(400, 'VALIDATION_ERROR', 'User ID and role are required');

    logger.debug('Dashboard service: fetching operator dashboard', { userId, userRole });

    const spResult = await spExecute('sp_get_operator_dashboard', [userId, userRole]);
    if (!spResult.success) throw new AppError(500, spResult.errorCode, spResult.errorMessage);

    const data = spResult.data || [];

    return {
      metrics:            data[0]?.[0] || {},
      queue:              data[1]      || [],
      recentOperations:   data[2]      || [],
      performanceTrend:   data[3]      || [],
      weeklySummary:      data[4]      || [],
      monthlySummary:     data[5]?.[0] || { current_month_count: 0, previous_month_count: 0 },
      activityTimeline:   data[6]      || [],
      performanceSummary: data[7]?.[0] || {
        fastest_op_minutes: 0, slowest_op_minutes: 0,
        avg_duration_minutes: 0, total_working_minutes: 0,
      },
      alerts:     data[8] || [],
      todayStats: data[9]?.[0] || { today_count: 0, yesterday_count: 0, completion_rate: 100 },
    };
  },
};

module.exports = dashboardService;
