const routePaths = {
  LOGIN: '/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_BINS: '/admin/bins',
  ADMIN_BAYS: '/admin/bays',
  ADMIN_TANKS: '/admin/tanks',
  ADMIN_MATERIALS: '/admin/materials',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_BIN_SUMMARY: '/admin/bin-summary',
  ADMIN_AUDIT_LOG: '/admin/audit/log',
  ADMIN_BIN_HISTORY: '/admin/audit/bin-history',
  ADMIN_SYSTEM_LOGS: '/admin/system-logs',
  ADMIN_ALERTS: '/admin/alerts',
  ADMIN_BIN_REGISTER: '/admin/bin-register',
  LOADER_DASHBOARD: '/loader/dashboard',
  LOADER_SCAN_LOAD: '/loader/scan-load',
  UNLOADER_DASHBOARD: '/unloader/dashboard',
  UNLOADER_SCAN_UNLOAD: '/unloader/scan-unload',
  CLEANER_DASHBOARD: '/cleaner/dashboard',
  CLEANER_SCAN_CLEAN: '/cleaner/scan-clean',
  QA_DASHBOARD: '/qa/dashboard',
  QA_QUEUE: '/qa/queue',
  QA_SCAN_INSPECT: '/qa/scan-inspect',
};

const sidebarConfig = {
  Administrator: {
    groups: [
      {
        title: 'Operations',
        items: [
          { label: 'Dashboard', path: routePaths.ADMIN_DASHBOARD },
        ],
      },
      {
        title: 'Masters',
        items: [
          { label: 'Bins', path: routePaths.ADMIN_BINS },
          { label: 'Register Bin', path: routePaths.ADMIN_BIN_REGISTER },
          { label: 'Bays', path: routePaths.ADMIN_BAYS },
          { label: 'Tanks', path: routePaths.ADMIN_TANKS },
          { label: 'Materials', path: routePaths.ADMIN_MATERIALS },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users', path: routePaths.ADMIN_USERS },
          { label: 'Reports', path: routePaths.ADMIN_REPORTS },
          { label: 'Bin Summary', path: routePaths.ADMIN_BIN_SUMMARY },
        ],
      },
      {
        title: 'Monitoring',
        items: [
          { label: 'System Logs', path: routePaths.ADMIN_SYSTEM_LOGS },
          { label: 'Alerts', path: routePaths.ADMIN_ALERTS },
        ],
      },
    ],
  },
  Loader: {
    groups: [
      {
        title: 'Operations',
        items: [
          { label: 'Dashboard', path: routePaths.LOADER_DASHBOARD },
          { label: 'Scan & Load', path: routePaths.LOADER_SCAN_LOAD },
        ],
      },
    ],
  },
  Unloader: {
    groups: [
      {
        title: 'Operations',
        items: [
          { label: 'Dashboard', path: routePaths.UNLOADER_DASHBOARD },
          { label: 'Scan & Unload', path: routePaths.UNLOADER_SCAN_UNLOAD },
        ],
      },
    ],
  },
  Cleaner: {
    groups: [
      {
        title: 'Operations',
        items: [
          { label: 'Dashboard', path: routePaths.CLEANER_DASHBOARD },
          { label: 'Scan & Clean', path: routePaths.CLEANER_SCAN_CLEAN },
        ],
      },
    ],
  },
  QA_Inspector: {
    groups: [
      {
        title: 'Operations',
        items: [
          { label: 'Dashboard', path: routePaths.QA_DASHBOARD },
          { label: 'Inspection Queue', path: routePaths.QA_QUEUE },
          { label: 'Scan & Inspect', path: routePaths.QA_SCAN_INSPECT },
        ],
      },
    ],
  },
};

export { routePaths, sidebarConfig };
export default routePaths;