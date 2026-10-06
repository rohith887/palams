import { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, CardHeader,
  Button, Chip, LinearProgress, Paper, Avatar, IconButton,
} from '@mui/material';
import {
  AddCircle, Autorenew, CheckCircle, CleaningServices, Error,
  HourglassEmpty, MoveToInbox, Schedule, TrendingUp, TrendingDown,
  History, Assignment, QrCodeScanner, ArrowForward, Launch,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../layout/PortalLayout';
import LoadingSpinner from '../common/LoadingSpinner';
import PageHeader from '../common/PageHeader';
import MetricCard from '../common/MetricCard';
import DataTable from '../common/DataTable';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import dashboardService from '../../services/dashboardService';
import { STATUS_LABELS } from '../../constants/statusLabels';

const ROLE_CONFIG = {
  Loader: {
    label: 'Loading',
    icon: <Autorenew />,
    color: 'info.main',
    scanPath: '/loader/scan-load',
    scanLabel: 'Scan & Load',
  },
  Unloader: {
    label: 'Unloading',
    icon: <MoveToInbox />,
    color: 'warning.main',
    scanPath: '/unloader/scan-unload',
    scanLabel: 'Scan & Unload',
  },
  Cleaner: {
    label: 'Cleaning',
    icon: <CleaningServices />,
    color: 'secondary.main',
    scanPath: '/cleaner/scan-clean',
    scanLabel: 'Scan & Clean',
  },
  QA_Inspector: {
    label: 'QA Inspection',
    icon: <HourglassEmpty />,
    color: '#7B1FA2',
    scanPath: '/qa/scan-inspect',
    scanLabel: 'Scan & Inspect',
  },
};

const DashboardCard = ({ title, subtitle, action, children, ...props }) => (
  <Card elevation={2} sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', ...props.sx }}>
    <CardHeader
      title={<Typography variant="h6" sx={{ fontSize: '0.9375rem' }}>{title}</Typography>}
      subheader={subtitle}
      action={action}
      sx={{ pb: 0 }}
    />
    <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 1.5, '&:last-child': { pb: 1.5 } }}>
      {children}
    </CardContent>
  </Card>
);

function TrendIndicator({ value }) {
  if (value == null) return null;
  if (value > 0) return <Chip icon={<TrendingUp />} label="Increasing" color="success" size="small" />;
  if (value < 0) return <Chip icon={<TrendingDown />} label="Decreasing" color="error" size="small" />;
  return <Chip label="Stable" color="default" size="small" />;
}

function MiniBarChart({ data, height = 80, barColor = 'primary.main' }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height, pt: 1 }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            {d.value}
          </Typography>
          <Box
            sx={{
              width: '100%', maxWidth: 32, minHeight: 4,
              height: Math.max((d.value / maxVal) * (height - 20), 4),
              bgcolor: barColor, borderRadius: '4px 4px 0 0',
              opacity: d.value > 0 ? 1 : 0.3,
              transition: 'height 0.3s',
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled' }}>
            {d.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function WeeklyBarChart({ data }) {
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const filled = dayOrder.map(day => {
    const found = data?.find(d => d.Day_Name === day);
    return { label: day, value: found ? found.Op_Count : 0 };
  });
  const maxVal = Math.max(...filled.map(d => d.value), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 100, pt: 1 }}>
      {filled.map((d, i) => (
        <Box key={d.label} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>{d.value}</Typography>
          <Box sx={{
            width: '100%', maxWidth: 28, minHeight: 4,
            height: Math.max((d.value / maxVal) * 70, 4),
            bgcolor: i >= 5 ? 'warning.light' : 'primary.main',
            borderRadius: '4px 4px 0 0',
            opacity: d.value > 0 ? 1 : 0.3,
          }} />
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>{d.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function Timeline({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <Box sx={{ position: 'relative', pl: 2.5 }}>
      <Box sx={{ position: 'absolute', left: 10, top: 4, bottom: 4, width: 2, bgcolor: 'divider' }} />
      {events.map((ev, i) => (
        <Box key={i} sx={{ position: 'relative', pb: 1.25, '&:last-child': { pb: 0 } }}>
          <Box sx={{
            position: 'absolute', left: -19, top: 4, width: 10, height: 10, borderRadius: '50%',
            bgcolor: ev.Action?.startsWith('Completed') ? 'success.main' : 'info.main',
            border: '2px solid', borderColor: 'background.paper', zIndex: 1,
          }} />
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{ev.Action}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {ev.Bin_Number}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
              {ev.Event_Time ? new Date(ev.Event_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default function OperatorDashboard({ user, logout, role }) {
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.Loader;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await dashboardService.getOperatorDashboard();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const m = data?.metrics || {};
  const todayStats = data?.todayStats || {};
  const diffPct = todayStats.yesterday_count > 0
    ? Math.round(((todayStats.today_count - todayStats.yesterday_count) / todayStats.yesterday_count) * 100)
    : todayStats.today_count > 0 ? 100 : 0;

  const monthlySummary = data?.monthlySummary || {};
  const monthDiff = monthlySummary.previous_month_count > 0
    ? Math.round(((monthlySummary.current_month_count - monthlySummary.previous_month_count) / monthlySummary.previous_month_count) * 100)
    : monthlySummary.current_month_count > 0 ? 100 : 0;

  const performanceTrend7 = (data?.performanceTrend || [])
    .filter(d => {
      const daysAgo = (new Date() - new Date(d.Op_Date)) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    })
    .map(d => ({ label: new Date(d.Op_Date).toLocaleDateString([], { weekday: 'short' }), value: d.Op_Count }));

  const performanceTrend30 = (data?.performanceTrend || [])
    .map(d => ({ label: new Date(d.Op_Date).getDate().toString(), value: d.Op_Count }));

  const kpiCards = [
    { label: `Today's ${config.label} Count`, value: m.period_today_count, icon: config.icon, color: config.color },
    { label: `This Week ${config.label} Count`, value: m.period_week_count, icon: <Schedule />, color: 'primary.main' },
    { label: `This Month ${config.label} Count`, value: m.period_month_count, icon: <History />, color: 'secondary.main' },
    { label: `Avg Time Today`, value: m.avg_time_today_minutes != null ? `${m.avg_time_today_minutes}m` : '—', icon: <HourglassEmpty />, color: 'info.main', subtext: 'Per operation' },
    { label: `Avg Time This Week`, value: m.avg_time_week_minutes != null ? `${m.avg_time_week_minutes}m` : '—', icon: <HourglassEmpty />, color: 'info.main', subtext: 'Per operation' },
    { label: `Avg Time This Month`, value: m.avg_time_month_minutes != null ? `${m.avg_time_month_minutes}m` : '—', icon: <HourglassEmpty />, color: 'info.main', subtext: 'Per operation' },
    { label: 'Pending Assigned', value: m.pending_count, icon: <Assignment />, color: 'warning.main', onClick: () => navigate(config.scanPath) },
    { label: 'Completed %', value: m.completed_percentage != null ? `${m.completed_percentage}%` : '—', icon: <CheckCircle />, color: 'success.main' },
  ];

  const queueColumns = [
    { key: 'Bin_Number', label: 'Bin', sortable: true, minWidth: 90 },
    {
      key: 'Current_Status', label: 'Status', minWidth: 130,
      render: (row) => (
        <Chip label={STATUS_LABELS[row.Current_Status] || row.Current_Status} size="small"
          color={row.Current_Status?.includes('In_Progress') ? 'info' : 'default'}
        />
      ),
    },
    { key: 'Material_Name', label: 'Material', minWidth: 120 },
    {
      key: 'Waiting_Time_Minutes', label: 'Waiting', minWidth: 70,
      render: (row) => {
        const mins = row.Waiting_Time_Minutes;
        if (mins == null) return '—';
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      },
    },
    {
      key: 'Priority', label: 'Priority', minWidth: 80,
      render: (row) => (
        <Chip label={row.Priority} size="small"
          color={row.Priority === 'High' ? 'error' : 'default'} variant="outlined"
        />
      ),
    },
    {
      key: 'actions', label: 'Action', minWidth: 80,
      render: (row) => (
        <Button size="small" variant="contained" sx={{ fontSize: '0.65rem', py: 0.25 }}
          onClick={(e) => { e.stopPropagation(); navigate(config.scanPath); }}>
          Start
        </Button>
      ),
    },
  ];

  const recentsColumns = [
    { key: 'Bin_Number', label: 'Bin', minWidth: 90 },
    { key: 'Material_Name', label: 'Material', minWidth: 120 },
    {
      key: 'Started_At', label: 'Started', minWidth: 130,
      render: (row) => row.Started_At ? new Date(row.Started_At).toLocaleString() : '—',
    },
    {
      key: 'Completed_At', label: 'Completed', minWidth: 130,
      render: (row) => row.Completed_At ? new Date(row.Completed_At).toLocaleString() : '—',
    },
    {
      key: 'Duration_Minutes', label: 'Duration', minWidth: 70,
      render: (row) => row.Duration_Minutes != null ? `${row.Duration_Minutes}m` : '—',
    },
    {
      key: 'Status', label: 'Status', minWidth: 90,
      render: (row) => (
        <Chip label={row.Status} size="small"
          color={row.Status === 'Completed' ? 'success' : 'warning'}
        />
      ),
    },
  ];

  const ps = data?.performanceSummary || {};

  return (
    <PortalLayout user={user} onLogout={logout}>
      <Box sx={{ p: 3, bgcolor: 'grey.100', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: '1.375rem' }}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
              {' '}{user?.Full_Name?.split(' ')[0] || 'Operator'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.25, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {config.label} Dashboard
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<QrCodeScanner />} onClick={() => navigate(config.scanPath)} size="small">
              {config.scanLabel}
            </Button>
          </Box>
        </Box>

        {loading && !data && <LoadingSpinner />}

        {error && (
          <EmptyState
            icon={<Error />}
            title="Failed to load dashboard"
            message={error}
            actionLabel="Retry"
            onAction={fetchDashboard}
          />
        )}

        {!loading && !error && data && (
          <Grid container spacing={3}>

            {kpiCards.map(kpi => (
              <Grid item xs={6} sm={4} md={3} lg={1.5} key={kpi.label}>
                <MetricCard
                  icon={kpi.icon}
                  value={kpi.value}
                  label={kpi.label}
                  color={kpi.color}
                  subtext={kpi.subtext}
                  onClick={kpi.onClick}
                />
              </Grid>
            ))}

            <Grid item xs={12} md={7}>
              <DashboardCard
                title="My Queue"
                subtitle={`${(data.queue || []).length} pending`}
                action={
                  <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate(config.scanPath)}>
                    Scan Next
                  </Button>
                }
              >
                {(data.queue || []).length === 0 ? (
                  <EmptyState icon={<CheckCircle />} title="No pending bins" message={`All bins in your ${config.label} queue have been processed.`} />
                ) : (
                  <DataTable
                    columns={queueColumns}
                    rows={data.queue || []}
                    keyField="Bin_ID"
                    size="small"
                  />
                )}
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={5}>
              <DashboardCard
                title="Today's Statistics"
                subtitle={`${config.label} performance`}
              >
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
                      <Typography variant="h4" sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'primary.main' }}>
                        {todayStats.today_count || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Today</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
                      <Typography variant="h4" sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'text.secondary' }}>
                        {todayStats.yesterday_count || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Yesterday</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
                      <Typography variant="h4" sx={{ fontSize: '1.25rem', fontWeight: 700, color: diffPct >= 0 ? 'success.main' : 'error.main' }}>
                        {diffPct >= 0 ? '+' : ''}{diffPct}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">vs Yesterday</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'background.paper' }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <Typography variant="h4" sx={{ fontSize: '1.25rem', fontWeight: 700, color: 'success.main' }}>
                          {todayStats.completion_rate || 0}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">Completion Rate</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={todayStats.completion_rate || 0}
                    sx={{ height: 8, borderRadius: 1, bgcolor: 'grey.200' }}
                  />
                </Box>
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <DashboardCard title="Performance Trend — Last 7 Days">
                {performanceTrend7.length === 0 ? (
                  <EmptyState icon={<TrendingUp />} title="No data" message="Complete operations to see your trend." />
                ) : (
                  <>
                    <MiniBarChart data={performanceTrend7} barColor="info.main" />
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
                      <TrendIndicator value={performanceTrend7.length >= 2 ? performanceTrend7[performanceTrend7.length - 1].value - performanceTrend7[0].value : null} />
                    </Box>
                  </>
                )}
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <DashboardCard title="Performance Trend — Last 30 Days">
                {performanceTrend30.length === 0 ? (
                  <EmptyState icon={<TrendingUp />} title="No data" message="Complete operations to see your trend." />
                ) : (
                  <MiniBarChart data={performanceTrend30} barColor="secondary.main" />
                )}
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={5}>
              <DashboardCard title="Weekly Summary">
                {(data.weeklySummary || []).length === 0 ? (
                  <EmptyState icon={<Schedule />} title="No data this week" />
                ) : (
                  <WeeklyBarChart data={data.weeklySummary} />
                )}
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <DashboardCard title="Monthly Summary">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                    <Typography variant="body2" color="text.secondary">This Month</Typography>
                    <Typography variant="h6" fontWeight={700}>{monthlySummary.current_month_count || 0}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                    <Typography variant="body2" color="text.secondary">Previous Month</Typography>
                    <Typography variant="h6" fontWeight={700}>{monthlySummary.previous_month_count || 0}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                    <Typography variant="body2" color="text.secondary">Difference</Typography>
                    <Typography variant="h6" fontWeight={700} color={monthDiff >= 0 ? 'success.main' : 'error.main'}>
                      {monthDiff >= 0 ? '+' : ''}{monthDiff}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                    <Typography variant="body2" color="text.secondary">Avg per Day</Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {new Date().getDate() > 0
                        ? Math.round((monthlySummary.current_month_count || 0) / new Date().getDate())
                        : 0}
                    </Typography>
                  </Box>
                </Box>
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <DashboardCard title="Performance Summary">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                    <Typography variant="caption" color="text.secondary">Fastest</Typography>
                    <Typography variant="body2" fontWeight={600}>{ps.fastest_op_minutes || 0}m</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                    <Typography variant="caption" color="text.secondary">Slowest</Typography>
                    <Typography variant="body2" fontWeight={600}>{ps.slowest_op_minutes || 0}m</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                    <Typography variant="caption" color="text.secondary">Average</Typography>
                    <Typography variant="body2" fontWeight={600}>{ps.avg_duration_minutes || 0}m</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                    <Typography variant="caption" color="text.secondary">Total Working</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {ps.total_working_minutes ? `${Math.floor(ps.total_working_minutes / 60)}h ${ps.total_working_minutes % 60}m` : '0h'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                    <Typography variant="caption" color="text.secondary">Utilization</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {ps.total_working_minutes > 0
                        ? `${Math.min(Math.round((ps.total_working_minutes / 480) * 100), 100)}%`
                        : '0%'}
                    </Typography>
                  </Box>
                </Box>
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={5}>
              <DashboardCard title="Personal Activity">
                {(data.activityTimeline || []).length === 0 ? (
                  <EmptyState icon={<History />} title="No activity" message="Start an operation to see your activity here." />
                ) : (
                  <Timeline events={data.activityTimeline} />
                )}
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <DashboardCard
                title="My Alerts"
                subtitle={data.alerts?.length > 0 ? `${data.alerts.length} unread` : 'No alerts'}
                action={data.alerts?.length > 0 ? <Button size="small" component={Link} to="/admin/alerts" endIcon={<Launch />}>View All</Button> : null}
              >
                {(data.alerts || []).length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                    <CheckCircle sx={{ color: 'success.main', mr: 1.5, fontSize: 28 }} />
                    <Box>
                      <Typography variant="body1" fontWeight={600} color="success.main" sx={{ fontSize: '0.875rem' }}>All Clear</Typography>
                      <Typography variant="caption" color="text.secondary">No pending alerts.</Typography>
                    </Box>
                  </Box>
                ) : (
                  (data.alerts || []).slice(0, 5).map(alert => (
                    <Box key={alert.Alert_ID} sx={{
                      display: 'flex', alignItems: 'center', py: 0.5, px: 1, mb: 0.25,
                      borderRadius: 1, borderLeft: 4,
                      borderColor: alert.Severity === 'Critical' ? 'error.main' : alert.Severity === 'Warning' ? 'warning.main' : 'info.main',
                      bgcolor: 'background.paper',
                    }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }} noWrap>
                          {alert.Alert_Type?.replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {alert.Bin_Number ? `Bin ${alert.Bin_Number} · ` : ''}
                          {alert.Created_At ? new Date(alert.Created_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                      </Box>
                      <Chip label={alert.Severity} size="small" variant="outlined"
                        color={alert.Severity === 'Critical' ? 'error' : alert.Severity === 'Warning' ? 'warning' : 'info'}
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                      />
                    </Box>
                  ))
                )}
              </DashboardCard>
            </Grid>

            <Grid item xs={12} md={7}>
              <DashboardCard
                title="Recent Operations"
                subtitle="Last 10 completed"
              >
                {(data.recentOperations || []).length === 0 ? (
                  <EmptyState icon={<History />} title="No recent operations" message={`Complete your first ${config.label.toLowerCase()} to see history here.`} />
                ) : (
                  <DataTable
                    columns={recentsColumns}
                    rows={data.recentOperations || []}
                    keyField={(row, i) => `${row.Bin_Number}-${row.Started_At}-${i}`}
                    size="small"
                  />
                )}
              </DashboardCard>
            </Grid>

          </Grid>
        )}
      </Box>
    </PortalLayout>
  );
}
