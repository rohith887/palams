import { createContext, useContext } from 'react';

const ThemeContext = createContext(null);

export function ThemeContextProvider({ children }) {
  const value = { mode: 'light', toggleTheme: () => {} };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within a ThemeContextProvider');
  return ctx;
}

export default ThemeContext;