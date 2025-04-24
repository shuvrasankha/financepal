// A centralized theme file for consistent styling across the app
const Theme = {
  light: {
    colors: {
      // Primary brand colors
      primary: '#4F46E5',       // Indigo 600 - main brand color
      primaryLight: '#E0E7FF',  // Indigo 100 - light background
      primaryDark: '#3730A3',   // Indigo 800 - darker variation
      
      // Accent colors
      success: '#10B981',       // Emerald 500 - success actions/lent money
      error: '#EF4444',         // Red 500 - errors/borrowed money
      warning: '#F59E0B',       // Amber 500 - warnings/pending
      info: '#3B82F6',          // Blue 500 - information/investments

      // Neutrals
      dark: '#1F2937',          // Gray 800 - main text
      medium: '#6B7280',        // Gray 500 - secondary text
      light: '#E5E7EB',         // Gray 200 - borders
      lighter: '#F3F4F6',       // Gray 100 - backgrounds
      white: '#FFFFFF',         // White
      
      // Backgrounds
      background: '#F9FAFB',    // Gray 50 - main background
      card: '#FFFFFF',          // Card background
      
      // Additional
      mediumDark: '#4B5563',    // Gray 600 - medium-dark text
      borderLight: '#F3F4F6',   // Light border color
      overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
    },
  },
  
  dark: {
    colors: {
      // Primary brand colors - brightened for dark mode
      primary: '#818CF8',       // Indigo 400 - brighter for dark mode
      primaryLight: '#4F46E5',  // Use the light mode primary for better visibility
      primaryDark: '#6366F1',   // Indigo 500 - adjusted for dark mode
      
      // Accent colors - brightened for dark mode
      success: '#34D399',       // Emerald 400 - brighter for dark mode
      error: '#F87171',         // Red 400 - brighter for dark mode
      warning: '#FBBF24',       // Amber 400 - brighter for dark mode
      info: '#60A5FA',          // Blue 400 - brighter for dark mode

      // Neutrals - adjusted for better readability
      dark: '#F9FAFB',          // Gray 50 - very light text for better visibility
      medium: '#E5E7EB',        // Gray 200 - lighter for better readability
      light: '#4B5563',         // Gray 600 - lighter border color for visibility
      lighter: '#374151',       // Gray 700 - lighter background for contrast
      white: '#1F2937',         // Gray 800 - dark but not too dark
      
      // Backgrounds
      background: '#111827',    // Gray 900 - dark background
      card: '#1E293B',          // Slate 800 - slightly blue-tinted for better contrast
      
      // Additional
      mediumDark: '#D1D5DB',    // Gray 300 - light text for dark mode
      borderLight: '#374151',   // Darker border for dark mode
      overlay: 'rgba(0, 0, 0, 0.7)', // Darker modal overlay for dark mode
    },
  },
  
  // Typography (shared between light and dark)
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
    }
  },
  
  // Spacing (shared between light and dark)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border radii (shared between light and dark)
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999, // Fully rounded (for circles)
  },
  
  // Shadows - light mode
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
  
  // Shadows - dark mode
  shadowsDark: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 5,
    },
  },
  
  // Common styles for reuse - will be dynamically generated based on theme mode
  getCommonStyles: (isDark) => {
    const colors = isDark ? Theme.dark.colors : Theme.light.colors;
    const shadows = isDark ? Theme.shadowsDark : Theme.shadows;
    
    return {
      card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        ...shadows.sm,
      },
      button: {
        primary: {
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        secondary: {
          backgroundColor: colors.primaryLight,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        outline: {
          backgroundColor: 'transparent',
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      input: {
        backgroundColor: isDark ? colors.lighter : colors.background,
        borderWidth: 1,
        borderColor: colors.light,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: colors.dark,
      }
    };
  },
  
  // Helper function to get current theme colors
  getColors: (isDarkMode) => {
    return isDarkMode ? Theme.dark.colors : Theme.light.colors;
  }
};

// Legacy getters for backward compatibility
// IMPORTANT: These will always return light theme values, which is causing dark mode issues
// Consider migrating all components to use the theme context instead of these getters
Object.defineProperty(Theme, 'colors', {
  get: function() {
    return this.light.colors;
  }
});

Object.defineProperty(Theme, 'common', {
  get: function() {
    return this.getCommonStyles(false);
  }
});

export default Theme;