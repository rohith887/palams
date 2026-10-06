import useAuth from '../../../hooks/useAuth';
import OperatorDashboard from '../../../components/operator/OperatorDashboard';

export default function LoaderDashboard() {
  const { user, logout } = useAuth();
  return <OperatorDashboard user={user} logout={logout} role="Loader" />;
}
