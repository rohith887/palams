import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import Sidebar from '../Sidebar';
import Header from '../Header';
import Footer from '../Footer';
import ErrorBoundary from '../../common/ErrorBoundary';

/**
 * PBLMS — Portal Layout
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Enterprise shell: fixed Header (full-width), left Sidebar (below header),
 * scrollable main content area, and a sticky Footer.
 *
 * Header uses position="fixed" — taken out of normal flow.
 * The body element uses paddingTop (explicit px strings) to compensate
 * for the fixed Header height.
 *
 * IMPORTANT: We use long-form `paddingTop` with string values like
 * `'56px'` / `'60px'` instead of the `pt`/`mt` shorthand. MUI's spacing
 * multiplier (theme.spacing = 8) converts numeric values to spacing units:
 *   56 × 8 = 448px, 60 × 8 = 480px.
 * String values bypass this multiplier and are passed directly to CSS.
 * Sidebar manages its own `top` offset via Drawer paper sx.
 *
 * @param {Object}    props
 * @param {{ fullName: string, role: string }} [props.user]       Current user from AuthContext
 * @param {number}     [props.alertCount = 0]                     Unread alert count
 * @param {Function}   [props.onLogout]                           Logout handler
 * @param {ReactNode}   props.children                            Page content to render
 */
export default function PortalLayout({ user, alertCount = 0, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Header
        onMenuToggle={handleSidebarToggle}
        user={user}
        alertCount={alertCount}
        onLogout={onLogout}
      />

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          // Use explicit px strings to bypass MUI spacing multiplier (theme.spacing = 8).
          // `mt: { xs: 56, sm: 60 }` would compute → 448px / 480px.
          paddingTop: { xs: '56px', sm: '60px' },
        }}
      >
        <Sidebar
          open={sidebarOpen}
          onToggle={handleSidebarToggle}
          userRole={user?.role}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box
            component="main"
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              p: { xs: 2, sm: 3 },
              backgroundColor: 'background.default',
            }}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </Box>

          <Footer />
        </Box>
      </Box>
    </Box>
  );
}