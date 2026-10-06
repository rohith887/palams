import useAuth from '../../../hooks/useAuth';
import OperatorDashboard from '../../../components/operator/OperatorDashboard';

export default function QADashboard() {
  const { user, logout } = useAuth();
  return <OperatorDashboard user={user} logout={logout} role="QA_Inspector" />;
}
