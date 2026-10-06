import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import { routePaths } from '../constants/routePaths';

const ROLE_DASHBOARDS = {
  [ROLES.ADMINISTRATOR]: routePaths.ADMIN_DASHBOARD,
  [ROLES.LOADER]: routePaths.LOADER_DASHBOARD,
  [ROLES.UNLOADER]: routePaths.UNLOADER_DASHBOARD,
  [ROLES.CLEANER]: routePaths.CLEANER_DASHBOARD,
  [ROLES.QA_INSPECTOR]: routePaths.QA_DASHBOARD,
};

export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user?.role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    const home = ROLE_DASHBOARDS[user.role] || '/login';
    return <Navigate to={home} replace />;
  }
  return children;
}