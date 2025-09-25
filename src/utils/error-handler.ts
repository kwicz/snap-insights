/**
 * Comprehensive error handling system for SnapInsights extension
 */

import { ExtensionError, ErrorCategory } from '@/types';
import { debugLogger } from '@/utils/debug-logger';

/**
 * User-friendly error messages for different error types
 */
const USER_ERROR_MESSAGES: Record<string, string> = {
  // Permission errors
  permission_screenshot: 'Permission denied. Please refresh the page and try again.',
  permission_microphone: 'Microphone access denied. Please allow microphone access in your browser settings.',
  permission_tab_access: 'Cannot access this page. Please navigate to a regular website and try again.',

  // Screenshot errors
  screenshot_capture_failed: 'Failed to capture screenshot. Please try again.',
  screenshot_invalid_page: 'Cannot capture screenshots on system pages like chrome:// or extension pages.',
  screenshot_rate_limit: 'Please wait a moment before taking another screenshot.',
  screenshot_too_large: 'Screenshot is too large to process. Try capturing a smaller area.',

  // Journey mode errors
  journey_max_screenshots: 'Maximum number of screenshots reached for this journey. Please save and start a new journey.',
  journey_not_active: 'Journey mode is not currently active. Please start a journey first.',
  journey_save_failed: 'Failed to save journey. Please check your download permissions.',
  journey_invalid_state: 'Journey is in an invalid state. Please restart journey mode.',

  // Storage errors
  storage_quota_exceeded: 'Storage space full. Please clear some data and try again.',
  storage_sync_failed: 'Failed to sync settings. Please check your internet connection.',
  storage_corrupted: 'Settings are corrupted. Resetting to defaults.',

  // Network errors
  network_offline: 'You appear to be offline. Some features may not work properly.',
  network_timeout: 'Request timed out. Please check your internet connection.',
  network_font_load_failed: 'Failed to load fonts. The extension will use system fonts.',

  // Voice/transcription errors
  voice_not_supported: 'Voice recording is not supported in this browser.',
  voice_permission_denied: 'Microphone permission denied. Please allow microphone access.',
  voice_recording_failed: 'Voice recording failed. Please try again.',
  voice_transcription_failed: 'Transcription service is unavailable. Your recording was saved without text.',

  // General errors
  extension_context_invalid: 'Extension was reloaded. Please refresh the page and try again.',
  operation_cancelled: 'Operation was cancelled.',
  unknown_error: 'An unexpected error occurred. Please try again.',
};

/**
 * Error recovery suggestions for different error types
 */
const ERROR_RECOVERY_ACTIONS: Record<string, string[]> = {
  permission_screenshot: [
    'Refresh the page and try again',
    'Check that the page is a regular website (not chrome:// or extension pages)',
    'Restart your browser if the problem persists',
  ],
  permission_microphone: [
    'Click the microphone icon in your browser\'s address bar',
    'Select "Always allow" for microphone access',
    'Check your browser\'s privacy settings',
  ],
  screenshot_capture_failed: [
    'Try capturing a different area of the page',
    'Refresh the page and try again',
    'Check that the page has finished loading',
  ],
  journey_max_screenshots: [
    'Save your current journey using the "Save Journey" button',
    'Start a new journey to continue capturing',
  ],
  storage_quota_exceeded: [
    'Clear your browser\'s extension data',
    'Delete old screenshots from your downloads folder',
    'Restart your browser to free up memory',
  ],
  voice_permission_denied: [
    'Click the microphone icon in your browser\'s address bar',
    'Select "Always allow" for microphone access',
    'Check your system\'s microphone permissions',
  ],
  extension_context_invalid: [
    'Refresh the current page',
    'Restart the browser if the problem persists',
    'Reinstall the extension if issues continue',
  ],
};

/**
 * Interface for user-facing error notification
 */
export interface UserErrorNotification {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  actions: Array<{
    label: string;
    action: string;
  }>;
  recoverySteps?: string[];
  canRetry: boolean;
  canDismiss: boolean;
}

/**
 * Error handling service class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ExtensionError[] = [];
  private maxQueueSize = 10;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an extension error with user notification
   */
  handleError(error: Error | ExtensionError, context?: Record<string, any>): UserErrorNotification {
    let extensionError: ExtensionError;

    if (error instanceof ExtensionError) {
      extensionError = error;
    } else {
      // Convert regular error to ExtensionError
      extensionError = this.categorizeError(error);
    }

    // Add to error queue for debugging
    this.addToQueue(extensionError);

    // Log the error
    debugLogger.error('Error handled:', {
      error: extensionError,
      context,
      timestamp: Date.now(),
    });

    // Create user notification
    return this.createUserNotification(extensionError);
  }

  /**
   * Categorize generic errors into ExtensionError types
   */
  private categorizeError(error: Error): ExtensionError {
    const message = error.message.toLowerCase();

    // Permission-related errors
    if (message.includes('permission') || message.includes('denied') || message.includes('forbidden')) {
      if (message.includes('microphone') || message.includes('media') || message.includes('audio')) {
        return new ExtensionError(error.message, 'permission', 'permission_microphone', { originalError: error });
      }
      if (message.includes('tab') || message.includes('script') || message.includes('access')) {
        return new ExtensionError(error.message, 'permission', 'permission_tab_access', { originalError: error });
      }
      return new ExtensionError(error.message, 'permission', 'permission_screenshot', { originalError: error });
    }

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('offline')) {
      if (message.includes('timeout')) {
        return new ExtensionError(error.message, 'network', 'network_timeout', { originalError: error });
      }
      if (message.includes('offline')) {
        return new ExtensionError(error.message, 'network', 'network_offline', { originalError: error });
      }
      return new ExtensionError(error.message, 'network', 'network_timeout', { originalError: error });
    }

    // Storage-related errors
    if (message.includes('quota') || message.includes('storage') || message.includes('disk')) {
      return new ExtensionError(error.message, 'storage', 'storage_quota_exceeded', { originalError: error });
    }

    // Extension context errors
    if (message.includes('context') || message.includes('invalidated') || message.includes('extension')) {
      return new ExtensionError(error.message, 'operation', 'extension_context_invalid', { originalError: error });
    }

    // Default to unknown error
    return new ExtensionError(error.message, 'operation', 'unknown_error', { originalError: error });
  }

  /**
   * Create user-friendly notification from ExtensionError
   */
  private createUserNotification(error: ExtensionError): UserErrorNotification {
    const userMessage = USER_ERROR_MESSAGES[error.code] || USER_ERROR_MESSAGES.unknown_error;
    const recoverySteps = ERROR_RECOVERY_ACTIONS[error.code] || [];

    let type: 'error' | 'warning' | 'info' = 'error';
    let canRetry = true;
    let canDismiss = true;

    // Adjust notification type based on error category
    switch (error.category) {
      case 'validation':
        type = 'warning';
        canRetry = false;
        break;
      case 'network':
        type = 'warning';
        break;
      case 'permission':
        type = 'error';
        canRetry = false;
        break;
      default:
        type = 'error';
    }

    const actions: Array<{ label: string; action: string }> = [];

    if (canRetry) {
      actions.push({ label: 'Try Again', action: 'retry' });
    }

    if (recoverySteps.length > 0) {
      actions.push({ label: 'Help', action: 'show_help' });
    }

    if (canDismiss) {
      actions.push({ label: 'Dismiss', action: 'dismiss' });
    }

    return {
      title: this.getErrorTitle(error),
      message: userMessage,
      type,
      actions,
      recoverySteps,
      canRetry,
      canDismiss,
    };
  }

  /**
   * Get appropriate title for error type
   */
  private getErrorTitle(error: ExtensionError): string {
    switch (error.category) {
      case 'permission':
        return 'Permission Required';
      case 'network':
        return 'Connection Issue';
      case 'storage':
        return 'Storage Issue';
      case 'validation':
        return 'Invalid Input';
      case 'resource':
        return 'Resource Error';
      case 'operation':
        return 'Operation Failed';
      default:
        return 'Error';
    }
  }

  /**
   * Add error to queue for debugging
   */
  private addToQueue(error: ExtensionError): void {
    this.errorQueue.push(error);

    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(): ExtensionError[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error queue
   */
  clearErrors(): void {
    this.errorQueue = [];
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: ExtensionError): boolean {
    const unrecoverableErrors = [
      'permission_microphone',
      'permission_tab_access',
      'extension_context_invalid',
      'journey_max_screenshots',
    ];

    return !unrecoverableErrors.includes(error.code);
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    byCodes: Record<string, number>;
    recent: number; // errors in last hour
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const stats = {
      total: this.errorQueue.length,
      byCategory: {} as Record<ErrorCategory, number>,
      byCodes: {} as Record<string, number>,
      recent: 0,
    };

    this.errorQueue.forEach(error => {
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;

      // Count by code
      stats.byCodes[error.code] = (stats.byCodes[error.code] || 0) + 1;

      // Count recent errors (assuming timestamp is stored in details)
      const errorTime = error.details?.timestamp as number;
      if (errorTime && errorTime > oneHourAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  /**
   * Handle specific screenshot errors
   */
  handleScreenshotError(error: Error, context: { coordinates?: { x: number; y: number }; mode?: string } = {}): UserErrorNotification {
    let code = 'screenshot_capture_failed';

    if (error.message.includes('rate limit') || error.message.includes('wait')) {
      code = 'screenshot_rate_limit';
    } else if (error.message.includes('system page') || error.message.includes('chrome://')) {
      code = 'screenshot_invalid_page';
    } else if (error.message.includes('too large') || error.message.includes('size')) {
      code = 'screenshot_too_large';
    }

    const extensionError = new ExtensionError(error.message, 'operation', code, {
      originalError: error,
      context,
      timestamp: Date.now(),
    });

    return this.handleError(extensionError);
  }

  /**
   * Handle journey mode specific errors
   */
  handleJourneyError(error: Error, context: { screenshotCount?: number; isActive?: boolean } = {}): UserErrorNotification {
    let code = 'journey_invalid_state';

    if (error.message.includes('maximum') || error.message.includes('limit')) {
      code = 'journey_max_screenshots';
    } else if (error.message.includes('not active') || error.message.includes('inactive')) {
      code = 'journey_not_active';
    } else if (error.message.includes('save') || error.message.includes('download')) {
      code = 'journey_save_failed';
    }

    const extensionError = new ExtensionError(error.message, 'operation', code, {
      originalError: error,
      context,
      timestamp: Date.now(),
    });

    return this.handleError(extensionError);
  }

  /**
   * Handle voice recording errors
   */
  handleVoiceError(error: Error, context: { recordingDuration?: number; hasPermission?: boolean } = {}): UserErrorNotification {
    let code = 'voice_recording_failed';

    if (error.message.includes('permission') || error.message.includes('denied')) {
      code = 'voice_permission_denied';
    } else if (error.message.includes('not supported') || error.message.includes('unavailable')) {
      code = 'voice_not_supported';
    } else if (error.message.includes('transcription') || error.message.includes('speech')) {
      code = 'voice_transcription_failed';
    }

    const extensionError = new ExtensionError(error.message, 'permission', code, {
      originalError: error,
      context,
      timestamp: Date.now(),
    });

    return this.handleError(extensionError);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();