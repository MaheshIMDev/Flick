/**
 * Teal-Green Dark Mode Theme Colors
 * Matching mobile app design
 */

export const Colors = {
    light: {
      background: '#FFFFFF',
      surface: '#F8F9FA',
      card: '#FFFFFF',
      text: {
        primary: '#1A1A1A',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
      },
      border: '#E5E7EB',
      teal: {
        50: '#E6FFFA',
        100: '#B2F5EA',
        500: '#14B8A6', // Primary teal
        600: '#0D9488',
        700: '#0F766E',
      },
      error: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B',
    },
    dark: {
      background: '#121212', // Deep charcoal
      surface: '#1E1E1E',
      card: '#2A2A2A',
      text: {
        primary: '#FFFFFF',
        secondary: '#B0B0B0',
        tertiary: '#808080',
      },
      border: '#3A3A3A',
      teal: {
        50: '#E6FFFA',
        100: '#B2F5EA',
        500: '#14B8A6', // Primary teal
        600: '#0D9488',
        700: '#0F766E',
      },
      error: '#F87171',
      success: '#34D399',
      warning: '#FBBF24',
    },
  };
  
  export type ColorScheme = 'light' | 'dark';
  
  export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  };
  
  export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  };
  
  export const FontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  };
  
  export const FontWeight = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  