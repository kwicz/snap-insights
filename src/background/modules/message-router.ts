/**
 * Message routing and handling for background script
 */

import { getBackgroundMessageService } from '@/shared/services/message-service';
import { screenshotHandler } from './screenshot-handler';
import { settingsHandler } from './settings-handler';
import { extensionLifecycleHandler } from './extension-lifecycle';
import { backgroundLogger } from '@/utils/debug-logger';
import { ExtensionMessage, ActivateExtensionMessage, DeactivateExtensionMessage } from '@/types/messages';

/**
 * Message router for background script
 */
export class MessageRouter {
  private messageService = getBackgroundMessageService();

  /**
   * Initialize message routing
   */
  initialize(): void {
    this.registerHandlers();
    backgroundLogger.info('Message router initialized');
  }

  /**
   * Register all message handlers
   */
  private registerHandlers(): void {
    // Test/ping messages
    this.messageService.registerHandler('TEST_MESSAGE' as any, async (message, sender, sendResponse) => {
      sendResponse({
        success: true,
        message: 'Background script is working!',
      });
    });

    // Screenshot operations
    this.messageService.registerHandler('CAPTURE_SCREENSHOT', async (message, sender, sendResponse) => {
      try {
        // Check if we can still communicate with the sender tab
        if (!sender.tab?.id) {
          sendResponse({ success: false, error: 'No valid tab context' });
          return;
        }

        const result = await screenshotHandler.handleScreenshotCapture(
          (message as any).data,
          sender.tab?.id
        );
        sendResponse(result);

      } catch (error) {
        backgroundLogger.error('Screenshot capture error:', error);
        
        // Check if this is a context invalidation error
        if (this.isContextInvalidationError(error)) {
          sendResponse({
            success: false,
            error: 'Extension context invalidated. Please refresh the page and try again.',
          });
        } else {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    });

    this.messageService.registerHandler('SAVE_SCREENSHOT', async (message, sender, sendResponse) => {
      try {
        const result = await screenshotHandler.saveScreenshot((message as any).data);
        sendResponse(result);
      } catch (error) {
        backgroundLogger.error('Save screenshot error:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save screenshot',
        });
      }
    });

    // Settings operations
    this.messageService.registerHandler('UPDATE_SETTINGS', async (message, sender, sendResponse) => {
      try {
        await settingsHandler.handleSettingsUpdate((message as any).data);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.messageService.registerHandler('GET_SETTINGS', async (message, sender, sendResponse) => {
      try {
        const result = await settingsHandler.handleGetSettings();
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.messageService.registerHandler('GET_STORAGE_STATS', async (message, sender, sendResponse) => {
      try {
        const result = await settingsHandler.handleGetStorageStats();
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.messageService.registerHandler('TOGGLE_MODE', async (message, sender, sendResponse) => {
      try {
        const result = await settingsHandler.handleModeToggle();
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Extension lifecycle operations
    this.messageService.registerHandler('ACTIVATE_EXTENSION', async (message, sender, sendResponse) => {
      try {
        const activateMsg = message as ActivateExtensionMessage;
        const result = await extensionLifecycleHandler.handleActivateExtension({
          mode: activateMsg.data.mode,
          selectedIcon: activateMsg.data.selectedIcon,
        });
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.messageService.registerHandler('DEACTIVATE_EXTENSION', async (message, sender, sendResponse) => {
      try {
        const result = await extensionLifecycleHandler.handleDeactivateExtension();
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Legacy support
    this.messageService.registerHandler('START_CAPTURE', async (message, sender, sendResponse) => {
      try {
        // Get the selected icon from storage
        const { selectedIcon } = await chrome.storage.local.get('selectedIcon');
        
        const result = await extensionLifecycleHandler.handleActivateExtension({
          mode: (message as any).data.mode,
          selectedIcon: selectedIcon || 'blue',
        });
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    backgroundLogger.debug('All message handlers registered');
  }

  /**
   * Check if error is related to context invalidation
   */
  private isContextInvalidationError(error: any): boolean {
    if (!(error instanceof Error)) return false;
    
    const contextErrors = [
      'Extension context invalidated',
      'Could not establish connection',
      'The message port closed before a response was received'
    ];
    
    return contextErrors.some(errorText => error.message.includes(errorText));
  }

  /**
   * Cleanup message handlers
   */
  cleanup(): void {
    // The message service handles cleanup internally
    backgroundLogger.debug('Message router cleanup completed');
  }
}

// Singleton instance
export const messageRouter = new MessageRouter();