import { ExtensionError } from '@/types';

// Error recovery constants
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const JITTER_FACTOR = 0.1; // 10% random jitter

// Error categories for different recovery strategies
export enum ErrorCategory {
  TRANSIENT = 'transient', // Temporary errors that may resolve on retry
  PERSISTENT = 'persistent', // Errors that require user intervention
  FATAL = 'fatal', // Unrecoverable errors
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  category?: ErrorCategory;
  onRetry?: (attempt: number, error: Error) => void;
  onFallback?: () => Promise<void>;
  fallbackValue?: any;
}

export interface ErrorRecoveryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  category: ErrorCategory;
}

interface StorageStats {
  available: number;
  usage: number;
  quota: number;
}

/**
 * Error recovery system for handling various failure scenarios
 */
export class ErrorRecoverySystem {
  private static instance: ErrorRecoverySystem;
  private errorLog: Map<string, Array<{ timestamp: number; error: Error }>> =
    new Map();
  private recoveryStrategies: Map<string, (error: Error) => Promise<void>> =
    new Map();

  private constructor() {
    this.initializeDefaultStrategies();
  }

  static getInstance(): ErrorRecoverySystem {
    if (!ErrorRecoverySystem.instance) {
      ErrorRecoverySystem.instance = new ErrorRecoverySystem();
    }
    return ErrorRecoverySystem.instance;
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Storage errors
    this.recoveryStrategies.set('storage', async (error) => {
      await this.cleanupStorage();
      await this.validateStorageIntegrity();
    });

    // Network errors
    this.recoveryStrategies.set('network', async (error) => {
      await this.waitForNetworkConnectivity();
    });

    // Permission errors
    this.recoveryStrategies.set('permission', async (error) => {
      await this.requestPermissions();
    });

    // Resource errors
    this.recoveryStrategies.set('resource', async (error) => {
      await this.freeUpResources();
    });
  }

  /**
   * Retry an operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<ErrorRecoveryResult<T>> {
    const {
      maxRetries = MAX_RETRIES,
      initialDelay = INITIAL_RETRY_DELAY,
      maxDelay = MAX_RETRY_DELAY,
      category = ErrorCategory.TRANSIENT,
      onRetry,
      onFallback,
      fallbackValue,
    } = options;

    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < maxRetries) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempts + 1,
          category,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;

        // Log the error
        this.logError(lastError);

        // Execute category-specific recovery strategy
        await this.executeRecoveryStrategy(lastError);

        // Notify retry callback
        onRetry?.(attempts, lastError);

        if (attempts < maxRetries) {
          // Calculate delay with exponential backoff and jitter
          const delay = Math.min(
            initialDelay *
              Math.pow(2, attempts - 1) *
              (1 + Math.random() * JITTER_FACTOR),
            maxDelay
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, try fallback if provided
    if (onFallback) {
      try {
        await onFallback();
        return {
          success: true,
          result: fallbackValue,
          attempts,
          category,
        };
      } catch (fallbackError) {
        lastError =
          fallbackError instanceof Error
            ? fallbackError
            : new Error(String(fallbackError));
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      category,
    };
  }

  /**
   * Execute recovery strategy for an error
   */
  private async executeRecoveryStrategy(error: Error): Promise<void> {
    const errorType = this.categorizeError(error);
    const strategy = this.recoveryStrategies.get(errorType);

    if (strategy) {
      try {
        await strategy(error);
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }
  }

  /**
   * Categorize error for recovery strategy selection
   */
  private categorizeError(error: Error): string {
    if (error instanceof ExtensionError) {
      return error.category;
    }

    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
      return 'storage';
    }
    if (errorMessage.includes('network') || errorMessage.includes('offline')) {
      return 'network';
    }
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('access')
    ) {
      return 'permission';
    }
    if (errorMessage.includes('memory') || errorMessage.includes('resource')) {
      return 'resource';
    }

    return 'unknown';
  }

  /**
   * Log error for analysis
   */
  private logError(error: Error): void {
    const errorType = this.categorizeError(error);
    const errorLog = this.errorLog.get(errorType) || [];

    errorLog.push({
      timestamp: Date.now(),
      error,
    });

    // Keep last 100 errors per type
    if (errorLog.length > 100) {
      errorLog.shift();
    }

    this.errorLog.set(errorType, errorLog);
  }

  /**
   * Clean up storage when errors occur
   */
  private async cleanupStorage(): Promise<void> {
    try {
      const storageStats = await new Promise<StorageStats>((resolve) => {
        chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
          resolve({
            available: chrome.storage.local.QUOTA_BYTES,
            usage: bytesInUse,
            quota: chrome.storage.local.QUOTA_BYTES,
          });
        });
      });

      if (storageStats.usage > storageStats.quota * 0.9) {
        // Remove old data
        const oldData = await this.findOldStorageData();
        await chrome.storage.local.remove(oldData);
      }
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  /**
   * Validate storage integrity
   */
  private async validateStorageIntegrity(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(null);

      // Check for corrupted data
      for (const [key, value] of Object.entries(data)) {
        if (this.isDataCorrupted(value)) {
          await chrome.storage.local.remove(key);
        }
      }
    } catch (error) {
      console.error('Storage validation failed:', error);
    }
  }

  /**
   * Wait for network connectivity
   */
  private waitForNetworkConnectivity(): Promise<void> {
    return new Promise((resolve) => {
      const checkConnectivity = () => {
        if (navigator.onLine) {
          resolve();
        } else {
          setTimeout(checkConnectivity, 1000);
        }
      };

      window.addEventListener('online', () => resolve());
      checkConnectivity();
    });
  }

  /**
   * Request necessary permissions
   */
  private async requestPermissions(): Promise<void> {
    try {
      const permissions = {
        permissions: ['storage', 'downloads'],
        origins: ['<all_urls>'],
      };

      await chrome.permissions.request(permissions);
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  }

  /**
   * Free up system resources
   */
  private async freeUpResources(): Promise<void> {
    try {
      // Clear object URL cache
      const objectUrls = await this.getObjectUrls();
      objectUrls.forEach(URL.revokeObjectURL);

      // Close unused tabs
      const tabs = await chrome.tabs.query({ active: false, audible: false });
      const tabsToClose = tabs.slice(10); // Keep last 10 tabs
      await Promise.all(tabsToClose.map((tab) => chrome.tabs.remove(tab.id!)));

      // Clear extension cache
      await this.clearExtensionCache();
    } catch (error) {
      console.error('Resource cleanup failed:', error);
    }
  }

  /**
   * Find old storage data for cleanup
   */
  private async findOldStorageData(): Promise<string[]> {
    const data = await chrome.storage.local.get(null);
    const now = Date.now();
    const oldKeys: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (this.isOldData(value, now)) {
        oldKeys.push(key);
      }
    }

    return oldKeys;
  }

  /**
   * Check if data is corrupted
   */
  private isDataCorrupted(data: any): boolean {
    if (!data) return false;

    try {
      // Check for common corruption patterns
      if (typeof data === 'object') {
        JSON.stringify(data); // Will throw if circular reference
        return false;
      }
      if (typeof data === 'string') {
        return data.includes('\0') || /[\uD800-\uDFFF]/.test(data);
      }
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Check if data is old (> 30 days)
   */
  private isOldData(data: any, now: number): boolean {
    if (!data || typeof data !== 'object') return false;
    const timestamp = data.timestamp || data.savedAt || data.createdAt;
    if (!timestamp) return false;
    return now - timestamp > 30 * 24 * 60 * 60 * 1000;
  }

  /**
   * Get all object URLs created by the extension
   */
  private async getObjectUrls(): Promise<string[]> {
    // This is a mock implementation
    // In a real extension, you would track object URLs when creating them
    return [];
  }

  /**
   * Clear extension cache
   */
  private async clearExtensionCache(): Promise<void> {
    if (chrome.extension.getViews) {
      const views = chrome.extension.getViews();
      views.forEach((view) => {
        if (view !== window) {
          // Clear view-specific resources
          view.location.reload();
        }
      });
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, { count: number; lastOccurred: number }> {
    const stats: Record<string, { count: number; lastOccurred: number }> = {};

    for (const [type, errors] of this.errorLog.entries()) {
      stats[type] = {
        count: errors.length,
        lastOccurred: errors[errors.length - 1]?.timestamp || 0,
      };
    }

    return stats;
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): void {
    this.errorLog.clear();
  }
}

// Export singleton instance
export const errorRecovery = ErrorRecoverySystem.getInstance();
