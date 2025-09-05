/**
 * Application-wide constants for SnapInsights extension
 */

// Extension metadata
export const APP_NAME = 'SnapInsights';
export const APP_SHORT_NAME = 'SnapInsights';
export const EXTENSION_PREFIX = 'insight-clip';

// Version and compatibility
export const MIN_CHROME_VERSION = 88;
export const MANIFEST_VERSION = 3;

// Performance and timing
export const PING_INTERVAL = 20000; // 20 seconds
export const MIN_CAPTURE_INTERVAL = 1000; // 1 second between captures
export const SCRIPT_LOAD_DELAY = 500; // ms to wait for script loading
export const DIALOG_FOCUS_DELAY = 100; // ms delay before focusing elements
export const OUTSIDE_CLICK_DELAY = 200; // ms delay before enabling outside click
export const ANIMATION_DURATION = 600; // ms for animations
export const NOTIFICATION_DURATION = 3000; // ms for notifications

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  SCREENSHOTS: 'screenshots',
  STATS: 'stats',
  EXTENSION_STATE: 'extensionState',
  EXTENSION_ACTIVE: 'extensionActive',
  CURRENT_MODE: 'currentMode',
  SELECTED_ICON: 'selectedIcon',
} as const;

// File and download settings
export const FILE_SETTINGS = {
  DEFAULT_FILENAME_PREFIX: 'insight-clip',
  IMAGE_FORMAT: 'png' as const,
  AUDIO_FORMAT: 'webm' as const,
  DEFAULT_DOWNLOAD_PATH: 'Downloads/Screenshots',
  MAX_FILENAME_LENGTH: 255,
} as const;

// Audio and transcription settings
export const AUDIO_SETTINGS = {
  SAMPLE_RATE: 16000,
  BITS_PER_SECOND: 128000,
  CHUNK_INTERVAL: 1000, // ms
  MAX_RECORDING_DURATION: 300000, // 5 minutes
  SILENCE_TIMEOUT: 2000, // ms
} as const;

// Extension modes
export const EXTENSION_MODES = {
  SNAP: 'snap',
  ANNOTATE: 'annotate',
  TRANSCRIBE: 'transcribe',
} as const;

export type ExtensionMode = typeof EXTENSION_MODES[keyof typeof EXTENSION_MODES];

// Icon types
export const ICON_TYPES = {
  LIGHT: 'light',
  BLUE: 'blue',
  DARK: 'dark',
} as const;

export type IconType = typeof ICON_TYPES[keyof typeof ICON_TYPES];

// Default settings
export const DEFAULT_SETTINGS = {
  MODE: EXTENSION_MODES.SNAP,
  ICON: ICON_TYPES.BLUE,
  MARKER_SIZE: 32,
  MARKER_OPACITY: 0.8,
  FONT_FAMILY: 'League Spartan, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  EXTENSION_CONTEXT_INVALID: 'Extension context invalidated. Please refresh the page.',
  NO_ACTIVE_TAB: 'No active tab found',
  MICROPHONE_ACCESS_DENIED: 'Microphone access denied. Please allow microphone access and try again.',
  MICROPHONE_NOT_FOUND: 'No microphone found. Please check your audio device.',
  SCREENSHOT_CAPTURE_FAILED: 'Failed to capture screenshot',
  SYSTEM_PAGE_ERROR: 'Cannot use Snap Mode on system pages. Please navigate to a regular website and try again.',
  RATE_LIMIT_ERROR: 'Please wait a moment before taking another screenshot',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SCREENSHOT_SAVED: 'Screenshot saved successfully!',
  ANNOTATED_SCREENSHOT_SAVED: 'Annotated screenshot saved successfully!',
  TRANSCRIBED_SCREENSHOT_SAVED: 'Transcribed screenshot saved successfully!',
} as const;