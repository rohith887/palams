import { CssBaseline, ThemeProvider } from '@mui/material';
import muiTheme from './theme/muiTheme';
import { ThemeContextProvider } from './contexts/ThemeContext';
import { AuthContextProvider } from './contexts/AuthContext';
import { AlertContextProvider } from './contexts/AlertContext';
import { SessionContextProvider } from './contexts/SessionContext';
import { NotificationContextProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRouter from './routes/AppRouter';


export default function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <ThemeContextProvider>
          <AuthContextProvider>
            <NotificationContextProvider>
              <SessionContextProvider>
                <AlertContextProvider>
                  <AppRouter />
                </AlertContextProvider>
              </SessionContextProvider>
            </NotificationContextProvider>
          </AuthContextProvider>
        </ThemeContextProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
