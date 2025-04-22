// A centralized theme file for consistent styling across the app
const Theme = {
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
  },
  
  // Typography
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
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border radii
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999, // Fully rounded (for circles)
  },
  
  // Shadows
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
  
  // Common styles for reuse
  common: {
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    button: {
      primary: {
        backgroundColor: '#4F46E5',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      secondary: {
        backgroundColor: '#E0E7FF',
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
        borderColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    input: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
    }
  }
};

export default Theme;