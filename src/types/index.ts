// Re-export all type definitions
export * from './screenshot';
export * from './messages';

/**
 * Screenshot data with metadata
 */
export interface ScreenshotData {
  /** Base64 encoded image data */
  dataUrl: string;
  /** URL of the page where screenshot was taken */
  url: string;
  /** Timestamp when screenshot was taken */
  timestamp: number;
  /** Click coordinates */
  coordinates: {
    x: number;
    y: number;
  };
  /** Optional text annotation */
  annotation?: string;
  /** Optional voice note URL */
  voiceNote?: string;
}

/**
 * Marker color and style settings
 */
export interface MarkerColorSettings {
  /** Color in hex format */
  color: string;
  /** Opacity between 0 and 1 */
  opacity: number;
  /** Size in pixels */
  size: number;
  /** Line style */
  style: 'solid' | 'dashed' | 'dotted';
}

/**
 * Voice recording preferences
 */
export interface VoicePreferences {
  /** Enable voice recording feature */
  enabled: boolean;
  /** Automatically transcribe recordings */
  autoTranscribe: boolean;
  /** Recording language code (e.g., 'en-US') */
  language: string;
  /** Maximum recording duration in seconds */
  maxDuration: number;
  /** Recording quality */
  quality: 'low' | 'medium' | 'high';
  /** Enable noise reduction */
  noiseReduction: boolean;
  /** Enable echo cancellation */
  echoCancellation: boolean;
}

/**
 * Text annotation preferences
 */
export interface TextPreferences {
  /** Default font size in pixels */
  defaultFontSize: number;
  /** Default text color in hex format */
  defaultColor: string;
  /** Font family with fallbacks */
  fontFamily: string;
  /** Enable spell checking */
  spellCheck: boolean;
  /** Enable auto-save feature */
  autoSave: boolean;
  /** Maximum text length */
  maxLength: number;
}

/**
 * Save location settings
 */
export interface SaveLocationSettings {
  /** Base save path */
  path: string;
  /** Create monthly subdirectories */
  createMonthlyFolders: boolean;
  /** Organize by website domain */
  organizeByDomain: boolean;
}

/**
 * Combined extension settings
 */
/**
 * Transcription preferences
 */
export interface TranscriptionPreferences {
  /** Enable transcription feature */
  enabled: boolean;
  /** Language code (e.g., 'en-US') */
  language: string;
  /** Maximum duration in seconds */
  maxDuration: number;
  /** Minimum confidence threshold (0-1) */
  confidenceThreshold: number;
  /** Enable interim results */
  interimResults: boolean;
  /** Auto-stop after silence duration (seconds) */
  silenceTimeout: number;
}

export interface ExtensionSettings {
  /** Current operation mode */
  mode: ExtensionMode;
  /** Marker color settings */
  markerColor: MarkerColorSettings;
  /** Save location settings */
  saveLocation: SaveLocationSettings;
  /** Voice preferences */
  voice: VoicePreferences;
  /** Text preferences */
  text: TextPreferences;
  /** Transcription preferences */
  transcription: TranscriptionPreferences;
}

/**
 * Annotation data structure
 */
export interface AnnotationData {
  /** Optional text annotation */
  text?: string;
  /** Optional voice note URL */
  voiceNote?: string;
  /** Annotation coordinates */
  coordinates: {
    x: number;
    y: number;
  };
}

/**
 * Extension operation mode
 */
export type ExtensionMode = 'snap' | 'annotate' | 'transcribe';

/**
 * Error categories for better error handling
 */
export type ErrorCategory =
  | 'storage'
  | 'network'
  | 'permission'
  | 'resource'
  | 'validation'
  | 'operation';

/**
 * Custom error class for extension-specific errors
 */
export class ExtensionError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    category: ErrorCategory,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExtensionError';
    this.category = category;
    this.code = code;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ExtensionError.prototype);
  }

  /**
   * Create storage error
   */
  static storage(
    message: string,
    code = 'storage_error',
    details?: Record<string, unknown>
  ): ExtensionError {
    return new ExtensionError(message, 'storage', code, details);
  }

  /**
   * Create network error
   */
  static network(
    message: string,
    code = 'network_error',
    details?: Record<string, unknown>
  ): ExtensionError {
    return new ExtensionError(message, 'network', code, details);
  }

  /**
   * Create permission error
   */
  static permission(
    message: string,
    code = 'permission_error',
    details?: Record<string, unknown>
  ): ExtensionError {
    return new ExtensionError(message, 'permission', code, details);
  }

  /**
   * Create resource error
   */
  static resource(
    message: string,
    code = 'resource_error',
    details?: Record<string, unknown>
  ): ExtensionError {
    return new ExtensionError(message, 'resource', code, details);
  }

  /**
   * Create validation error
   */
  static validation(
    message: string,
    code = 'validation_error',
    details?: Record<string, unknown>
  ): ExtensionError {
    return new ExtensionError(message, 'validation', code, details);
  }

  /**
   * Create operation error
   */
  static operation(
    message: string,
    code = 'operation_error',
    details?: Record<string, unknown>
  ): ExtensionError {
    return new ExtensionError(message, 'operation', code, details);
  }
}
