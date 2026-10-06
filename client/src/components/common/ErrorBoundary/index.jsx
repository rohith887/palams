import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplayIcon from '@mui/icons-material/Replay';

/**
 * PBLMS — Error Boundary
 *
 * Catches unhandled render errors. Shows friendly recovery UI with
 * "Return to Scanner" and "Restart Workflow" options for operator pages.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReturnToDashboard = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleReturnToScanner = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const scannerPath = path.substring(0, path.lastIndexOf('/')) + '/dashboard';
      window.location.href = scannerPath;
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Something unexpected happened
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480 }}>
            An unexpected error occurred. You can return to the scanner or restart your workflow without losing data.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={this.handleReturnToScanner}
              sx={{ minHeight: 56, minWidth: 200 }}
            >
              Return to Scanner
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={this.handleReset}
              sx={{ minHeight: 56, minWidth: 200 }}
            >
              Restart Workflow
            </Button>
          </Box>
          <Button
            variant="text"
            color="inherit"
            onClick={this.handleReturnToDashboard}
            sx={{ mt: 2 }}
          >
            Return to Dashboard
          </Button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                maxWidth: 600,
                backgroundColor: 'grey.100',
                borderRadius: 1,
                textAlign: 'left',
                overflow: 'auto',
              }}
            >
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}