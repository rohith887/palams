import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import AuthLayout from '../../../components/layout/AuthLayout';
import FormField from '../../../components/common/FormField';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import useAuth from '../../../hooks/useAuth';
import ERRORS from '../../../constants/errorMessages';
import { routePaths, sidebarConfig } from '../../../constants/routePaths';

const ROLE_DASHBOARDS = {
  Administrator: routePaths.ADMIN_DASHBOARD,
  Loader: routePaths.LOADER_SCAN_LOAD,
  Unloader: routePaths.UNLOADER_SCAN_UNLOAD,
  Cleaner: routePaths.CLEANER_SCAN_CLEAN,
  QA_Inspector: routePaths.QA_SCAN_INSPECT,
};

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to role dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const target = ROLE_DASHBOARDS[user.role] || '/';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
  if (isAuthenticated && user?.role) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('Username is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      // Login sets isAuthenticated=true → useEffect handles navigation
    } catch (err) {
      const apiError = err.response?.data?.error;
      if (apiError?.code) {
        setError(ERRORS[apiError.code] || apiError.message);
      } else {
        setError(ERRORS.NETWORK_ERROR);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <LoadingSpinner fullScreen message="Signing in..." />}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Typography variant="h2" align="center" gutterBottom>
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormField
            name="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
          />
          <FormField
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          <Box
            component="button"
            type="submit"
            disabled={loading}
            sx={{
              mt: 1,
              minHeight: 56,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              border: 'none',
              borderRadius: 1,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'primary.dark' },
              '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Box>
        </Box>
      </Box>
    </AuthLayout>
  );
}