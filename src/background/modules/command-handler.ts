/**
 * Keyboard command handler for background script
 */

import { screenshotHandler } from './screenshot-handler';
import { settingsHandler } from './settings-handler';
import { backgroundLogger } from '@/utils/debug-logger';

/**
 * Handler for keyboard commands
 */
export class CommandHandler {
  /**
   * Initialize command handling
   */
  initialize(): void {
    this.setupCommandListener();
    backgroundLogger.info('Command handler initialized');
  }

  /**
   * Setup keyboard command listener
   */
  private setupCommandListener(): void {
    if (!chrome?.commands?.onCommand) {
      backgroundLogger.warn('Chrome commands API not available');
      return;
    }

    chrome.commands.onCommand.addListener(async (command) => {
      try {
        backgroundLogger.debug('Command received:', command);
        await this.handleCommand(command);
      } catch (error) {
        backgroundLogger.error('Command handling failed:', error);
      }
    });

    backgroundLogger.debug('Command listener setup complete');
  }

  /**
   * Handle individual commands
   */
  private async handleCommand(command: string): Promise<void> {
    switch (command) {
      case 'toggle-mode':
        await this.handleToggleMode();
        break;
        
      case 'capture-screenshot':
        await this.handleCaptureScreenshot();
        break;
        
      default:
        backgroundLogger.warn('Unknown command:', command);
    }
  }

  /**
   * Handle toggle mode command
   */
  private async handleToggleMode(): Promise<void> {
    try {
      const result = await settingsHandler.handleModeToggle();
      backgroundLogger.info('Mode toggled via keyboard shortcut:', result.mode);
    } catch (error) {
      backgroundLogger.error('Failed to toggle mode via command:', error);
    }
  }

  /**
   * Handle capture screenshot command
   */
  private async handleCaptureScreenshot(): Promise<void> {
    try {
      // Get active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab?.id) {
        backgroundLogger.warn('No active tab for screenshot command');
        return;
      }

      // Capture screenshot at center of viewport
      const result = await screenshotHandler.handleScreenshotCapture(
        { coordinates: { x: 0, y: 0 } },
        tab.id
      );

      if (result.success) {
        backgroundLogger.info('Screenshot captured via keyboard shortcut');
      } else {
        backgroundLogger.error('Screenshot capture failed via command:', result.error);
      }
    } catch (error) {
      backgroundLogger.error('Failed to capture screenshot via command:', error);
    }
  }

  /**
   * Cleanup command handlers
   */
  cleanup(): void {
    // Chrome API doesn't provide a way to remove command listeners
    // They are automatically cleaned up when the service worker stops
    backgroundLogger.debug('Command handler cleanup completed');
  }
}

// Singleton instance
export const commandHandler = new CommandHandler();