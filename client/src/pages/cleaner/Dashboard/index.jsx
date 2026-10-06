import useAuth from '../../../hooks/useAuth';
import OperatorDashboard from '../../../components/operator/OperatorDashboard';

export default function CleanerDashboard() {
  const { user, logout } = useAuth();
  return <OperatorDashboard user={user} logout={logout} role="Cleaner" />;
}
