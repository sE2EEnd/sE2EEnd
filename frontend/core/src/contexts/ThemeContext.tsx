import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeConfig } from '../services/api';

interface ThemeContextType {
  theme: ThemeConfig | null;
  loading: boolean;
}

const defaultTheme: ThemeConfig = {
  appName: 'sE2EEnd',
  logoUrl: '',
  colors: {
    primaryFrom: 'blue-600',
    primaryTo: 'blue-700',
    primaryAccent: 'blue-500',
    primaryHex: '#2563eb',
    primaryDarkHex: '#1d4ed8',
    primaryLightHex: '#3b82f6',
  },
};

const ThemeContext = createContext<ThemeContextType>({ theme: defaultTheme, loading: false });

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load theme from config.json
    const loadTheme = async () => {
      try {
        const response = await fetch('/config.json');
        const config = await response.json();

        if (config.theme) {
          // Update CSS variables
          const root = document.documentElement;
          if (config.theme.primaryColor) {
            root.style.setProperty('--color-primary', config.theme.primaryColor);
          }
          if (config.theme.primaryDark) {
            root.style.setProperty('--color-primary-dark', config.theme.primaryDark);
          }
          if (config.theme.primaryLight) {
            root.style.setProperty('--color-primary-light', config.theme.primaryLight);
          }

          // Update theme state
          setTheme({
            appName: config.theme.appName || defaultTheme.appName,
            logoUrl: config.theme.logoUrl || '',
            colors: {
              primaryFrom: 'blue-600',
              primaryTo: 'blue-700',
              primaryAccent: 'blue-500',
              primaryHex: config.theme.primaryColor || defaultTheme.colors.primaryHex,
              primaryDarkHex: config.theme.primaryDark || defaultTheme.colors.primaryDarkHex,
              primaryLightHex: config.theme.primaryLight || defaultTheme.colors.primaryLightHex,
            },
          });

          // Set document title
          if (config.theme.appName) {
            document.title = config.theme.appName;
          }
        }
      } catch (error) {
        console.warn('Failed to load theme config, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};
