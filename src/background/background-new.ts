/**
 * Refactored background script entry point
 * Modular, maintainable architecture with clear separation of concerns
 */

import { messageRouter } from './modules/message-router';
import { commandHandler } from './modules/command-handler';
import { extensionLifecycleHandler } from './modules/extension-lifecycle';
import { fontService } from './services/font-service';
import { PING_INTERVAL } from '@/shared/constants/app-constants';
import { backgroundLogger } from '@/utils/debug-logger';

/**
 * Main background script class
 */
class BackgroundScript {
  private keepAliveInterval: number | null = null;

  /**
   * Initialize the background script
   */
  async initialize(): Promise<void> {
    try {
      backgroundLogger.info('Initializing background script...');

      // Initialize core services
      await this.initializeServices();

      // Setup message routing
      messageRouter.initialize();

      // Setup command handling
      commandHandler.initialize();

      // Setup installation handler
      this.setupInstallationHandler();

      // Start keep-alive mechanism
      this.startKeepAlive();

      backgroundLogger.info('Background script initialized successfully');

    } catch (error) {
      backgroundLogger.error('Failed to initialize background script:', error);
      throw error;
    }
  }

  /**
   * Initialize core services
   */
  private async initializeServices(): Promise<void> {
    // Pre-load font for better performance
    await fontService.loadFont();
    backgroundLogger.debug('Core services initialized');
  }

  /**
   * Setup installation handler
   */
  private setupInstallationHandler(): void {
    if (!chrome?.runtime?.onInstalled) {
      backgroundLogger.warn('Chrome runtime onInstalled API not available');
      return;
    }

    chrome.runtime.onInstalled.addListener(async (details) => {
      try {
        if (details.reason === 'install') {
          backgroundLogger.info('Extension installed, setting up defaults');
          await extensionLifecycleHandler.handleInstallation();
        }
      } catch (error) {
        backgroundLogger.error('Installation handler failed:', error);
      }
    });

    backgroundLogger.debug('Installation handler setup complete');
  }

  /**
   * Start keep-alive mechanism for service worker
   */
  private startKeepAlive(): void {
    try {
      // Create an alarm that fires periodically
      chrome.alarms.create('keepAlive', {
        periodInMinutes: 0.5, // Every 30 seconds
      });

      // Listen for alarm
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'keepAlive') {
          // Keep the worker alive by doing minimal work
          backgroundLogger.debug('Keep-alive ping');
        }
      });

      backgroundLogger.debug('Keep-alive mechanism started');

    } catch (error) {
      backgroundLogger.warn('Failed to start keep-alive mechanism:', error);
    }
  }

  /**
   * Cleanup background script
   */
  cleanup(): void {
    try {
      // Cleanup message router
      messageRouter.cleanup();

      // Cleanup command handler
      commandHandler.cleanup();

      // Clear keep-alive
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }

      // Clear alarms
      chrome.alarms.clear('keepAlive');

      backgroundLogger.info('Background script cleanup completed');

    } catch (error) {
      backgroundLogger.error('Background script cleanup failed:', error);
    }
  }
}

// Initialize background script
const backgroundScript = new BackgroundScript();

// Start initialization
backgroundScript.initialize().catch((error) => {
  backgroundLogger.error('Background script startup failed:', error);
});

// Handle service worker termination
self.addEventListener('beforeunload', () => {
  backgroundScript.cleanup();
});

// Export for testing (browser environment only)
declare const module: any;
if (typeof module !== 'undefined' && module?.exports) {
  module.exports = { backgroundScript };
}