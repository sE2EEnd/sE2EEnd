import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Hook to generate dynamic theme classes using CSS variables
 * All classes use the CSS variables defined in index.css and set from config.json
 */
export const useThemeClasses = () => {
  const { theme } = useTheme();

  return useMemo(() => {
    return {
      // Gradient backgrounds (using CSS variables)
      gradient: 'bg-gradient-to-br-primary',
      gradientButton: 'bg-gradient-primary hover:bg-gradient-primary-reverse',

      // Solid backgrounds
      bg: {
        primary: 'bg-primary',
        light: 'bg-gray-50',
        medium: 'bg-gray-100',
      },

      // Text colors
      text: {
        primary: 'text-primary',
        light: 'text-gray-100',
        dark: 'text-primary-dark',
      },

      // Border colors
      border: {
        primary: 'border-primary',
        light: 'border-gray-200',
        hover: 'hover:border-primary-light',
      },

      // Hover states
      hover: {
        bg: 'hover:bg-primary-dark',
        text: 'hover:text-primary',
      },

      // Sidebar specific (now using CSS variables)
      sidebar: {
        bg: 'bg-gradient-to-br-primary',
        header: 'bg-black/20',
        item: {
          active: 'bg-white text-primary-dark shadow-md',
          inactive: 'text-gray-100 hover:bg-white/10 hover:text-white',
        },
        border: 'border-white/10',
      },

      // Avatar/Badge
      avatar: 'bg-gradient-primary',

      // Raw color values from theme
      raw: {
        primaryHex: theme?.colors?.primaryHex || '#2563eb',
        primaryDarkHex: theme?.colors?.primaryDarkHex || '#1d4ed8',
        primaryLightHex: theme?.colors?.primaryLightHex || '#3b82f6',
      },
    };
  }, [theme]);
};
