import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ProtectedRoute from './ProtectedRoute';

// Lazy-loaded pages
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'));

// Admin pages — lazy loaded
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const BinMaster = React.lazy(() => import('../pages/admin/BinMaster'));
const BinRegister = React.lazy(() => import('../pages/admin/BinRegister'));
const BayMaster = React.lazy(() => import('../pages/admin/BayMaster'));
const TankMaster = React.lazy(() => import('../pages/admin/TankMaster'));
const MaterialMaster = React.lazy(() => import('../pages/admin/MaterialMaster'));
const Reports = React.lazy(() => import('../pages/admin/Reports'));
const BinSummary = React.lazy(() => import('../pages/admin/BinSummary'));
const Alerts = React.lazy(() => import('../pages/admin/Alerts'));
const AuditTrail = React.lazy(() => import('../pages/admin/AuditTrail'));
const SystemLogs = React.lazy(() => import('../pages/admin/SystemLogs'));
const BinHistory = React.lazy(() => import('../pages/admin/BinHistory'));
const WorkflowMonitor = React.lazy(() => import('../pages/admin/WorkflowMonitor'));
const UserManagement = React.lazy(() => import('../pages/admin/UserManagement'));

// Loader pages — lazy loaded
const LoaderDashboard = React.lazy(() => import('../pages/loader/Dashboard'));
const LoaderScanLoad = React.lazy(() => import('../pages/loader/ScanLoad'));

// Unloader pages — lazy loaded
const UnloaderDashboard = React.lazy(() => import('../pages/unloader/Dashboard'));
const UnloaderScanUnload = React.lazy(() => import('../pages/unloader/ScanUnload'));

// Cleaner pages — lazy loaded
const CleanerDashboard = React.lazy(() => import('../pages/cleaner/Dashboard'));
const CleanerScanClean = React.lazy(() => import('../pages/cleaner/ScanClean'));

// QA pages — lazy loaded
const QADashboard = React.lazy(() => import('../pages/qa/Dashboard'));
const QAQueue = React.lazy(() => import('../pages/qa/Queue'));
const QAWorkspace = React.lazy(() => import('../pages/qa/Workspace'));
const QAInspection = React.lazy(() => import('../pages/qa/Inspection'));
const QAScanInspect = React.lazy(() => import('../pages/qa/ScanInspect'));

// Placeholder for routes not yet implemented
const PlaceholderPage = ({ title }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <h2>{title}</h2>
  </div>
);

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>{children}</Suspense>
);

const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <SuspenseWrapper><LoginPage /></SuspenseWrapper> },

  // Root redirect — to login
  { path: '/', element: <Navigate to="/login" replace /> },

  // Admin portal — wrapped in ProtectedRoute to gate rendering until auth is ready
  { path: '/admin/dashboard', element: <SuspenseWrapper><ProtectedRoute><AdminDashboard /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/bins', element: <SuspenseWrapper><ProtectedRoute><BinMaster /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/bins/create', element: <SuspenseWrapper><ProtectedRoute><BinRegister /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/bin-register', element: <SuspenseWrapper><ProtectedRoute><BinRegister /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/bays', element: <SuspenseWrapper><ProtectedRoute><BayMaster /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/tanks', element: <SuspenseWrapper><ProtectedRoute><TankMaster /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/materials', element: <SuspenseWrapper><ProtectedRoute><MaterialMaster /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/reports', element: <SuspenseWrapper><ProtectedRoute><Reports /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/bin-summary', element: <SuspenseWrapper><ProtectedRoute><BinSummary /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/system-logs', element: <SuspenseWrapper><ProtectedRoute><SystemLogs /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/alerts', element: <SuspenseWrapper><ProtectedRoute><Alerts /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/audit/log', element: <SuspenseWrapper><ProtectedRoute><AuditTrail /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/audit/bin-history', element: <SuspenseWrapper><ProtectedRoute><BinHistory /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/workflow-monitor', element: <SuspenseWrapper><ProtectedRoute><WorkflowMonitor /></ProtectedRoute></SuspenseWrapper> },
  { path: '/admin/users', element: <SuspenseWrapper><ProtectedRoute><UserManagement /></ProtectedRoute></SuspenseWrapper> },

  // Loader portal
  { path: '/loader/dashboard', element: <SuspenseWrapper><ProtectedRoute><LoaderDashboard /></ProtectedRoute></SuspenseWrapper> },
  { path: '/loader/scan-load', element: <SuspenseWrapper><ProtectedRoute><LoaderScanLoad /></ProtectedRoute></SuspenseWrapper> },

  // Unloader portal
  { path: '/unloader/dashboard', element: <SuspenseWrapper><ProtectedRoute><UnloaderDashboard /></ProtectedRoute></SuspenseWrapper> },
  { path: '/unloader/scan-unload', element: <SuspenseWrapper><ProtectedRoute><UnloaderScanUnload /></ProtectedRoute></SuspenseWrapper> },

  // Cleaner portal
  { path: '/cleaner/dashboard', element: <SuspenseWrapper><ProtectedRoute><CleanerDashboard /></ProtectedRoute></SuspenseWrapper> },
  { path: '/cleaner/scan-clean', element: <SuspenseWrapper><ProtectedRoute><CleanerScanClean /></ProtectedRoute></SuspenseWrapper> },

  // QA portal
  { path: '/qa/dashboard', element: <SuspenseWrapper><ProtectedRoute><QADashboard /></ProtectedRoute></SuspenseWrapper> },
  { path: '/qa/queue', element: <SuspenseWrapper><ProtectedRoute><QAQueue /></ProtectedRoute></SuspenseWrapper> },
  { path: '/qa/scan-inspect', element: <SuspenseWrapper><ProtectedRoute><QAScanInspect /></ProtectedRoute></SuspenseWrapper> },
  { path: '/qa/workspace/:binId', element: <SuspenseWrapper><ProtectedRoute><QAWorkspace /></ProtectedRoute></SuspenseWrapper> },
  { path: '/qa/inspection/:binId', element: <SuspenseWrapper><ProtectedRoute><QAInspection /></ProtectedRoute></SuspenseWrapper> },

  // 404 catch-all
  { path: '*', element: <PlaceholderPage title="Page Not Found" /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
