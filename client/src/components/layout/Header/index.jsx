import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Box, Breadcrumbs,
  Link, useMediaQuery, useTheme, Menu, MenuItem, Avatar, Tooltip,
} from '@mui/material';
import { BiMenuAltLeft } from 'react-icons/bi';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { sidebarConfig } from '../../../constants/routePaths';
import { ROLE_LABELS } from '../../../constants/roles';

const breadcrumbLabelMap = {
  '/admin/dashboard': 'Dashboard',
  '/admin/bins': 'Bins',
  '/admin/bins/create': 'Register Bin',
  '/admin/bays': 'Bays',
  '/admin/tanks': 'Tanks',
  '/admin/materials': 'Materials',
  '/admin/users': 'Users',
  '/admin/reports': 'Reports',
  '/admin/bin-summary': 'Bin Summary',
  '/admin/audit/log': 'Audit Trail',
  '/admin/audit/bin-history': 'Bin History',
  '/admin/alerts': 'Alerts',
};

export default function Header({ onMenuToggle, user, alertCount = 0, onLogout }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleLogout = useCallback(() => {
    setUserMenuAnchor(null);
    onLogout?.();
    navigate('/login', { replace: true });
  }, [onLogout, navigate]);

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const label = breadcrumbLabelMap[path];
    if (!label) return null;
    return (
      <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{ ml: 2 }}>
        <Link underline="hover" color="text.secondary" onClick={() => navigate('/admin/dashboard')} sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
          {ROLE_LABELS[user?.role] || 'Admin'}
        </Link>
        <Typography color="text.primary" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</Typography>
      </Breadcrumbs>
    );
  }, [location.pathname, navigate, user?.role]);

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        zIndex: isDesktop ? theme.zIndex.drawer + 1 : theme.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 60 }, px: { xs: 1.5, sm: 2 }, gap: 1 }}>
        {/* Menu toggle — always visible on desktop (sidebar collapse), also on mobile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 0.5 }}>
          <IconButton
            edge="start"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar"
            sx={{ color: theme.palette.primary.main }}
          >
            <BiMenuAltLeft style={{ fontSize: 22 }} />
          </IconButton>

<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Box
    component="img"
    src="/Biocon_Logo.svg.png"
    alt="Biocon"
    sx={{
      height: 32,
      width: 'auto',
      objectFit: 'contain',
      display: { xs: 'none', sm: 'block' },
    }}
  />

  <Box
    component="img"
    src="/pfwithword.svg"
    alt="payfiller"
    sx={{
      height: 32,
      width: 'auto',
      objectFit: 'contain',
      display: { xs: 'none', sm: 'block' },
    }}
  />
</Box>
        </Box>



        {/* Breadcrumbs */}
        {breadcrumbs}

        <Box sx={{ flexGrow: 1 }} />

        {/* Right section — Notifications + User */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
            {user.role === 'Administrator' && (
              <IconButton
                size="small"
                aria-label={`${alertCount} unread alerts`}
                onClick={() => navigate('/admin/alerts')}
              >
                <Badge badgeContent={alertCount} color="error" max={99}>
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            )}

            {/* User button — avatar + name + dropdown arrow */}
            <Box
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                borderRadius: 1.5,
                px: 0.75,
                py: 0.5,
                transition: 'background 0.15s',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 600 }}>
                {user.fullName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {user.fullName || user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {user.role?.replace('_', ' ') || 'User'}
                </Typography>
              </Box>
              <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }} />
            </Box>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { mt: 0.5, minWidth: 180, borderRadius: 2 } } }}
            >
              <MenuItem disabled sx={{ opacity: '1 !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                    {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary' }}>
                      {user.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {user.role?.replace('_', ' ') || 'User'}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/admin/profile'); }} sx={{ gap: 1.25 }}>
                <PersonIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Profile</Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ gap: 1.25 }}>
                <LogoutIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}