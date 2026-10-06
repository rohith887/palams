import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useMediaQuery, useTheme, Box, Typography,
  IconButton, Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StorageIcon from '@mui/icons-material/Storage';
import ScienceIcon from '@mui/icons-material/Science';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TableChartIcon from '@mui/icons-material/TableChart';
import DnsIcon from '@mui/icons-material/Dns';
import { sidebarConfig } from '../../../constants/routePaths';
import { ROLE_LABELS } from '../../../constants/roles';

const HEADER_HEIGHT = 60; // px — matches Header Toolbar minHeight (sm+)
const ICON_MAP = {
  Dashboard: DashboardIcon,
  Bins: InventoryIcon,
  'Register Bin': AddCircleOutlineIcon,
  Bays: LocationOnIcon,
  Tanks: StorageIcon,
  Materials: ScienceIcon,
  Users: PeopleIcon,
  Reports: AssessmentIcon,
  'Bin Summary': TableChartIcon,
  'System Logs': DnsIcon,
  Alerts: NotificationsIcon,
  'Scan & Load': QrCodeScannerIcon,
  'Scan & Unload': QrCodeScannerIcon,
  'Scan & Clean': QrCodeScannerIcon,
  'Inspection Queue': QrCodeScannerIcon,
  'Scan & Inspect': QrCodeScannerIcon,
};

const DRAWER_WIDTH = 220;
const COLLAPSED_WIDTH = 72;

function SidebarContent({ open, onToggle, userRole, showToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  if (!userRole || !sidebarConfig[userRole]) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72 }}>
        {showToggle && (
          <IconButton onClick={onToggle} size="small">
            <BiChevronRightIcon style={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    );
  }

  const config = sidebarConfig[userRole];
  const navGroups = config.groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      Icon: ICON_MAP[item.label] || DashboardIcon,
    })),
  }));

  const isActive = useCallback(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname]
  );

  const renderNavItem = (link) => {
    const active = isActive(link.path);
    return (
      <ListItem key={link.path} disablePadding sx={{ mb: 0 }}>
        <ListItemButton
          onClick={() => navigate(link.path)}
          selected={active}
          sx={{
            minHeight: 42,
            justifyContent: open ? 'initial' : 'center',
            px: open ? 2 : 0,
            py: 0,
            mx: open ? 1 : 0.5,
            my: 0.125,
            borderRadius: open ? '0 8px 8px 0' : 1.5,
            ...(open
              ? {
                  borderLeft: '3px solid',
                  borderColor: active ? 'primary.main' : 'transparent',
                  '&.Mui-selected': {
                    backgroundColor: `${theme.palette.primary.main}0A`,
                    '&:hover': { backgroundColor: `${theme.palette.primary.main}12` },
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '& .MuiTypography-root': { color: 'primary.main', fontWeight: 600 },
                  },
                  '&:hover': { backgroundColor: 'action.hover' },
                }
              : {
                  '&.Mui-selected': {
                    backgroundColor: `${theme.palette.primary.main}0F`,
                    '&:hover': { backgroundColor: `${theme.palette.primary.main}1A` },
                  },
                }),
          }}
          title={!open ? link.label : undefined}
        >
          <ListItemIcon
            sx={{
              minWidth: open ? 28 : 0,
              mr: open ? 1 : 'auto',
              justifyContent: 'center',
              color: active ? 'primary.main' : 'text.secondary',
              '& .MuiSvgIcon-root': { fontSize: 20 },
            }}
          >
            <link.Icon />
          </ListItemIcon>
          {open && (
            <ListItemText
              primary={link.label}
              primaryTypographyProps={{
                fontSize: '0.78rem',
                fontWeight: active ? 600 : 400,
                noWrap: true,
                color: active ? 'primary.main' : 'text.primary',
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <>
      {/* Role label */}
      {open && userRole && (
        <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontSize: '0.55rem', color: 'text.disabled' }}>
            {ROLE_LABELS[userRole] || userRole}
          </Typography>
        </Box>
      )}

      {open
        ? navGroups.map((group) => (
            <Box key={group.title} sx={{ mb: group.title ? 1 : 0 }}>
              <Typography
                sx={{
                  px: 2,
                  pt: 1.25,
                  pb: 0.25,
                  fontSize: '0.52rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                  userSelect: 'none',
                }}
              >
                {group.title}
              </Typography>
              <List sx={{ px: 0.5, py: 0 }}>
                {group.items.map(renderNavItem)}
              </List>
            </Box>
          ))
        : (
          <List sx={{ px: 0, py: 0.5 }}>
            {navGroups.flatMap((g) => g.items).map(renderNavItem)}
          </List>
        )}
    </>
  );
}

function BiChevronRightIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function Sidebar({ open = true, onToggle, userRole }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              top: HEADER_HEIGHT,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: 200,
              }),
              overflowX: 'hidden',
              borderRight: '1px solid',
              borderColor: 'divider',
              pt: 1, /* top spacing below header */
            },
          }}
        >
          <SidebarContent open={open} onToggle={onToggle} userRole={userRole} showToggle />
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onToggle}
          sx={{
            '& .MuiDrawer-paper': {
              top: HEADER_HEIGHT,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              overflowX: 'hidden',
              borderRight: '1px solid',
              borderColor: 'divider',
              pt: 1,
            },
          }}
        >
          <SidebarContent open onToggle={onToggle} userRole={userRole} showToggle={false} />
        </Drawer>
      )}
    </>
  );
}