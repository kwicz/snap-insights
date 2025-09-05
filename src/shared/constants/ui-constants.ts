/**
 * UI-specific constants for SnapInsights extension
 */

// Z-index values
export const Z_INDEX = {
  DIALOG: 999999,
  NOTIFICATION: 999999,
  CLICK_FEEDBACK: 999999,
  OVERLAY: 999998,
} as const;

// Dialog dimensions
export const DIALOG_DIMENSIONS = {
  WIDTH: 300,
  MIN_HEIGHT: 200,
  MAX_HEIGHT: 400,
  PADDING: 20,
  HEADER_HEIGHT: 60,
  BUTTON_HEIGHT: 44,
} as const;

// Spacing and layout
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
} as const;

// Border radius
export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
} as const;

// Colors
export const COLORS = {
  PRIMARY: '#0277c0',
  PRIMARY_HOVER: '#004e7e',
  SUCCESS: '#10b981',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  
  // Text colors
  TEXT_PRIMARY: '#1f2937',
  TEXT_SECONDARY: '#6b7280',
  TEXT_MUTED: '#9ca3af',
  
  // Background colors
  BG_WHITE: '#ffffff',
  BG_GRAY_50: '#f9fafb',
  BG_GRAY_100: '#f3f4f6',
  
  // Border colors
  BORDER_LIGHT: '#e5e7eb',
  BORDER_DEFAULT: '#d1d5db',
  BORDER_FOCUS: '#3b82f6',
  
  // Icon colors
  ICON_LIGHT: '#f8fafc',
  ICON_BLUE: '#0277C0',
  ICON_DARK: '#1e293b',
  
  // Annotation colors
  ANNOTATION_BG: '#0277c0',
  ANNOTATION_BORDER: '#e5e7eb',
  TRANSCRIPTION_BG: '#0277c0',
  TRANSCRIPTION_BORDER: '#2563eb',
} as const;

// Typography
export const TYPOGRAPHY = {
  FONT_FAMILY: 'League Spartan, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  FONT_SIZES: {
    XS: '12px',
    SM: '14px',
    MD: '16px',
    LG: '18px',
    XL: '20px',
  },
  FONT_WEIGHTS: {
    NORMAL: '400',
    MEDIUM: '500',
    SEMIBOLD: '600',
    BOLD: '700',
  },
  LINE_HEIGHTS: {
    TIGHT: 1.25,
    NORMAL: 1.5,
    RELAXED: 1.75,
  },
} as const;

// Animation durations
export const ANIMATIONS = {
  FAST: '0.15s',
  NORMAL: '0.3s',
  SLOW: '0.6s',
  PULSE_DURATION: '1.5s',
} as const;

// Icon sizes
export const ICON_SIZES = {
  TOUCHPOINT: 64,
  MARKER_FALLBACK: 32,
  RECORDING_DOT: 12,
  CLOSE_BUTTON: 24,
} as const;

// Input constraints
export const INPUT_CONSTRAINTS = {
  ANNOTATION_MIN_HEIGHT: 60,
  ANNOTATION_MAX_HEIGHT: 200,
  TRANSCRIPTION_MIN_HEIGHT: 100,
  TRANSCRIPTION_MAX_HEIGHT: 200,
  MAX_TEXT_WIDTH: 250,
  MAX_ANNOTATION_WIDTH: 200,
} as const;

// CSS class names
export const CSS_CLASSES = {
  DIALOG: 'insight-clip-input-dialog',
  NOTIFICATION: 'insight-clip-notification',
  CLICK_FEEDBACK: 'insight-clip-click-feedback',
  FONT_LOADER: 'insight-clip-font-loader',
} as const;

// Google Fonts URL
export const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;500;600;700&display=swap';

// Font Face definition for service worker
export const LEAGUE_SPARTAN_FONT = {
  FAMILY: 'League Spartan',
  URL: 'url(https://fonts.gstatic.com/s/leaguespartan/v11/kJEqBuEW6A0lliaV_m88ja5Tws-Xv8Sic3WG.woff2) format("woff2")',
  WEIGHT: '400',
} as const;