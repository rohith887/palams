import useAuth from '../../../hooks/useAuth';
import OperatorDashboard from '../../../components/operator/OperatorDashboard';

export default function UnloaderDashboard() {
  const { user, logout } = useAuth();
  return <OperatorDashboard user={user} logout={logout} role="Unloader" />;
}
