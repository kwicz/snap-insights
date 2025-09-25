/**
 * Integration layer for error handling throughout the extension
 */

import { errorHandler } from './error-handler';
import { userNotificationService } from './user-notification';
import { debugLogger } from './debug-logger';
import { ExtensionError } from '@/types';

/**
 * Enhanced error handling wrapper functions for different extension operations
 */

/**
 * Wrap screenshot capture with comprehensive error handling
 */
export async function withScreenshotErrorHandling<T>(
  operation: () => Promise<T>,
  context: { coordinates?: { x: number; y: number }; mode?: string } = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const notification = errorHandler.handleScreenshotError(error as Error, context);

    // Show notification in content script context (if available)
    if (typeof window !== 'undefined' && window.document) {
      const notificationId = userNotificationService.showErrorNotification(notification, {
        duration: 5000,
        position: 'top-right',
      }, {
        onRetry: async () => {
          debugLogger.info('Retrying screenshot operation');
          try {
            await operation();
            userNotificationService.showNotification('Screenshot captured successfully!', 'success', { duration: 2000 });
          } catch (retryError) {
            // Handle retry failure
            const retryNotification = errorHandler.handleScreenshotError(retryError as Error, context);
            userNotificationService.showErrorNotification(retryNotification, { duration: 5000 });
          }
        }
      });
    }

    throw error;
  }
}

/**
 * Wrap journey mode operations with error handling
 */
export async function withJourneyErrorHandling<T>(
  operation: () => Promise<T>,
  context: { screenshotCount?: number; isActive?: boolean } = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const notification = errorHandler.handleJourneyError(error as Error, context);

    if (typeof window !== 'undefined' && window.document) {
      userNotificationService.showErrorNotification(notification, {
        duration: 7000, // Longer duration for journey errors
        position: 'top-right',
      });
    }

    throw error;
  }
}

/**
 * Wrap voice recording operations with error handling
 */
export async function withVoiceErrorHandling<T>(
  operation: () => Promise<T>,
  context: { recordingDuration?: number; hasPermission?: boolean } = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const notification = errorHandler.handleVoiceError(error as Error, context);

    if (typeof window !== 'undefined' && window.document) {
      userNotificationService.showErrorNotification(notification, {
        duration: 6000,
        position: 'top-right',
      }, {
        onShowHelp: (recoverySteps) => {
          debugLogger.info('Voice error recovery steps:', recoverySteps);
        }
      });
    }

    throw error;
  }
}

/**
 * Show loading notification with error handling
 */
export function showOperationProgress(
  operation: string,
  estimatedDuration?: number
): {
  notificationId: string;
  update: (message: string) => void;
  success: (message?: string) => void;
  error: (error: Error) => void;
  dismiss: () => void;
} {
  let notificationId = '';

  if (typeof window !== 'undefined' && window.document) {
    notificationId = userNotificationService.showLoadingNotification(
      `${operation}...`,
      { position: 'top-right' }
    );
  }

  return {
    notificationId,
    update: (message: string) => {
      if (notificationId) {
        userNotificationService.updateLoadingNotification(notificationId, message);
      }
    },
    success: (message?: string) => {
      if (notificationId) {
        userNotificationService.dismissNotification(notificationId);
        if (message) {
          userNotificationService.showNotification(message, 'success', { duration: 3000 });
        }
      }
    },
    error: (error: Error) => {
      if (notificationId) {
        userNotificationService.dismissNotification(notificationId);
        const notification = errorHandler.handleError(error);
        userNotificationService.showErrorNotification(notification, { duration: 5000 });
      }
    },
    dismiss: () => {
      if (notificationId) {
        userNotificationService.dismissNotification(notificationId);
      }
    }
  };
}

/**
 * Enhanced Chrome API wrappers with error handling
 */
export const chromeAPIWithErrorHandling = {
  /**
   * Capture visible tab with error handling
   */
  captureVisibleTab: async (windowId?: number): Promise<string> => {
    return await withScreenshotErrorHandling(async () => {
      if (!chrome.tabs?.captureVisibleTab) {
        throw new ExtensionError(
          'Screenshot capture not available',
          'permission',
          'screenshot_capture_failed'
        );
      }

      return new Promise<string>((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!dataUrl) {
            reject(new Error('Failed to capture screenshot - no data returned'));
          } else {
            resolve(dataUrl);
          }
        });
      });
    });
  },

  /**
   * Execute script with error handling
   */
  executeScript: async (details: chrome.scripting.ScriptInjection): Promise<chrome.scripting.InjectionResult[]> => {
    try {
      if (!chrome.scripting?.executeScript) {
        throw new ExtensionError(
          'Script injection not available',
          'permission',
          'permission_tab_access'
        );
      }

      const results = await chrome.scripting.executeScript(details);
      return results;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot access')) {
        throw new ExtensionError(
          'Cannot inject script on this page. Please navigate to a regular website.',
          'permission',
          'screenshot_invalid_page'
        );
      }
      throw error;
    }
  },

  /**
   * Send message with error handling
   */
  sendMessage: async <T = any>(tabId: number, message: any): Promise<T> => {
    try {
      return new Promise<T>((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Could not establish connection')) {
        throw new ExtensionError(
          'Cannot communicate with page. Please refresh and try again.',
          'operation',
          'extension_context_invalid'
        );
      }
      throw error;
    }
  },

  /**
   * Download file with error handling
   */
  download: async (options: chrome.downloads.DownloadOptions): Promise<number> => {
    try {
      return new Promise<number>((resolve, reject) => {
        chrome.downloads.download(options, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (typeof downloadId !== 'number') {
            reject(new Error('Download failed - invalid download ID'));
          } else {
            resolve(downloadId);
          }
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        throw new ExtensionError(
          'Download permission denied. Please check your browser settings.',
          'permission',
          'journey_save_failed'
        );
      }
      throw error;
    }
  },

  /**
   * Storage operations with error handling
   */
  storage: {
    get: async <T = any>(keys: string | string[] | object): Promise<T> => {
      try {
        return new Promise<T>((resolve, reject) => {
          chrome.storage.sync.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      } catch (error) {
        throw new ExtensionError(
          'Failed to read settings',
          'storage',
          'storage_sync_failed'
        );
      }
    },

    set: async (items: object): Promise<void> => {
      try {
        return new Promise<void>((resolve, reject) => {
          chrome.storage.sync.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('quota')) {
          throw new ExtensionError(
            'Storage quota exceeded',
            'storage',
            'storage_quota_exceeded'
          );
        }
        throw new ExtensionError(
          'Failed to save settings',
          'storage',
          'storage_sync_failed'
        );
      }
    },

    local: {
      get: async <T = any>(keys: string | string[] | object): Promise<T> => {
        try {
          return new Promise<T>((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(result);
              }
            });
          });
        } catch (error) {
          throw new ExtensionError(
            'Failed to read local data',
            'storage',
            'storage_sync_failed'
          );
        }
      },

      set: async (items: object): Promise<void> => {
        try {
          return new Promise<void>((resolve, reject) => {
            chrome.storage.local.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        } catch (error) {
          throw new ExtensionError(
            'Failed to save local data',
            'storage',
            'storage_sync_failed'
          );
        }
      }
    }
  }
};

/**
 * Create enhanced error boundary for async operations
 */
export function createErrorBoundary<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorType: 'screenshot' | 'journey' | 'voice' | 'general' = 'general'
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      let notification;

      switch (errorType) {
        case 'screenshot':
          notification = errorHandler.handleScreenshotError(error as Error);
          break;
        case 'journey':
          notification = errorHandler.handleJourneyError(error as Error);
          break;
        case 'voice':
          notification = errorHandler.handleVoiceError(error as Error);
          break;
        default:
          notification = errorHandler.handleError(error as Error);
      }

      // Show notification if in content script context
      if (typeof window !== 'undefined' && window.document) {
        userNotificationService.showErrorNotification(notification, { duration: 5000 });
      }

      throw error;
    }
  };
}

/**
 * Utility to show success notifications
 */
export function showSuccessNotification(message: string, duration = 3000): void {
  if (typeof window !== 'undefined' && window.document) {
    userNotificationService.showNotification(message, 'success', { duration });
  }
}

/**
 * Utility to show info notifications
 */
export function showInfoNotification(message: string, duration = 4000): void {
  if (typeof window !== 'undefined' && window.document) {
    userNotificationService.showNotification(message, 'info', { duration });
  }
}

/**
 * Utility to show warning notifications
 */
export function showWarningNotification(message: string, duration = 5000): void {
  if (typeof window !== 'undefined' && window.document) {
    userNotificationService.showNotification(message, 'warning', { duration });
  }
}

/**
 * Get error statistics for monitoring dashboard
 */
export function getErrorStatistics() {
  return errorHandler.getErrorStats();
}

/**
 * Clear error history (for debugging/reset)
 */
export function clearErrorHistory() {
  errorHandler.clearErrors();
  debugLogger.info('Error history cleared');
}