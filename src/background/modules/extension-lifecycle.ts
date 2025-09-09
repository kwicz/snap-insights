/**
 * Extension lifecycle management (activation, deactivation, installation)
 */

import { fontService } from '../services/font-service';
import {
  STORAGE_KEYS,
  EXTENSION_MODES,
  ICON_TYPES,
  ERROR_MESSAGES,
} from '@/shared/constants/app-constants';
import {
  isValidTabUrl,
  getSystemPageError,
} from '@/shared/utils/context-utils';
import { backgroundLogger } from '@/utils/debug-logger';
import { ExtensionError, ExtensionSettings, ExtensionMode } from '@/types';

export interface ActivationData {
  mode: ExtensionMode;
  selectedIcon: 'light' | 'blue' | 'dark';
}

/**
 * Handler for extension lifecycle operations
 */
export class ExtensionLifecycleHandler {
  /**
   * Handle extension activation
   */
  async handleActivateExtension(
    data: ActivationData
  ): Promise<{ success: boolean }> {
    try {
      backgroundLogger.debug('Activating extension', data);

      // Load font before activation
      await fontService.loadFont();

      // Store the current mode and selected icon
      await chrome.storage.local.set({
        [STORAGE_KEYS.CURRENT_MODE]: data.mode,
        [STORAGE_KEYS.SELECTED_ICON]: data.selectedIcon,
      });

      // Update badge
      await this.updateBadge(data.mode);

      // Inject content script into active tab
      const tab = await this.getActiveTab();
      if (!tab?.id) {
        throw new Error(ERROR_MESSAGES.NO_ACTIVE_TAB);
      }

      // Check if tab URL is valid for injection
      if (!isValidTabUrl(tab.url)) {
        throw new Error(getSystemPageError(tab.url));
      }

      await this.injectContentScript(tab.id);
      await this.sendActivationMessage(tab.id, data);

      backgroundLogger.info('Extension activated successfully', data);
      return { success: true };
    } catch (error) {
      backgroundLogger.error('Failed to activate extension:', error);
      // Re-throw the original error to preserve specific error messages for tests
      throw error;
    }
  }

  /**
   * Handle extension deactivation
   */
  async handleDeactivateExtension(): Promise<{ success: boolean }> {
    try {
      backgroundLogger.debug('Deactivating extension');

      // Store the inactive state
      await chrome.storage.local.set({
        [STORAGE_KEYS.CURRENT_MODE]: null,
        [STORAGE_KEYS.SELECTED_ICON]: null,
      });

      // Clear badge
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'SnapInsights' });

      // Send deactivation message to content script
      const tab = await this.getActiveTab();
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'DEACTIVATE_EXTENSION',
          });
        } catch (error) {
          // Content script might not be injected, ignore error
          backgroundLogger.debug(
            'Content script not available for deactivation message'
          );
        }
      }

      backgroundLogger.info('Extension deactivated successfully');
      return { success: true };
    } catch (error) {
      backgroundLogger.error('Failed to deactivate extension:', error);
      throw new ExtensionError(
        'Failed to deactivate extension',
        'operation',
        'deactivation_error',
        { originalError: error }
      );
    }
  }

  /**
   * Handle extension installation
   */
  async handleInstallation(): Promise<void> {
    try {
      backgroundLogger.info('Handling extension installation');

      const defaultSettings: ExtensionSettings = {
        mode: EXTENSION_MODES.SNAP as ExtensionMode,
        markerColor: {
          color: '#FF0000',
          opacity: 0.8,
          size: 5,
          style: 'solid',
        },
        saveLocation: {
          path: 'Downloads/Screenshots',
          createMonthlyFolders: true,
          organizeByDomain: true,
        },
        voice: {
          enabled: true,
          autoTranscribe: false,
          language: 'en-US',
          maxDuration: 60,
          quality: 'medium',
          noiseReduction: true,
          echoCancellation: true,
        },
        text: {
          defaultFontSize: 16,
          defaultColor: '#000000',
          fontFamily: 'Arial, sans-serif',
          spellCheck: true,
          autoSave: true,
          maxLength: 500,
        },
        transcription: {
          enabled: true,
          language: 'en-US',
          maxDuration: 300,
          confidenceThreshold: 0.8,
          interimResults: true,
          silenceTimeout: 2,
        },
      };

      await chrome.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: defaultSettings,
      });

      // Set initial extension state to no mode selected
      await chrome.storage.local.set({
        [STORAGE_KEYS.CURRENT_MODE]: null,
        [STORAGE_KEYS.SELECTED_ICON]: ICON_TYPES.BLUE,
      });

      // Clear any badge text (extension starts OFF)
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'SnapInsights' });

      backgroundLogger.info('Extension installation completed');
    } catch (error) {
      backgroundLogger.error('Failed to handle installation:', error);
      throw new ExtensionError(
        'Failed to initialize extension',
        'operation',
        'installation_error',
        { originalError: error }
      );
    }
  }

  /**
   * Update extension badge based on mode
   */
  async updateBadge(mode: ExtensionMode): Promise<void> {
    let text = 'S';
    let title = 'Snap Mode';

    switch (mode) {
      case EXTENSION_MODES.SNAP:
        text = 'S';
        title = 'Snap Mode';
        break;
      case EXTENSION_MODES.ANNOTATE:
        text = 'A';
        title = 'Annotate Mode';
        break;
      case EXTENSION_MODES.TRANSCRIBE:
        text = 'T';
        title = 'Transcribe Mode';
        break;
      default:
        text = 'S';
        title = 'Snap Mode';
    }

    await chrome.action.setBadgeText({ text });
    await chrome.action.setTitle({ title });

    backgroundLogger.debug('Badge updated', { mode, text, title });
  }

  /**
   * Get active tab
   */
  private async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tabs[0] || null;
    } catch (error) {
      backgroundLogger.error('Failed to get active tab:', error);
      return null;
    }
  }

  /**
   * Inject content script into tab
   */
  private async injectContentScript(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js'],
      });

      // Wait for script to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test if content script is responsive
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        backgroundLogger.debug('Content script injection successful');
      } catch (pingError) {
        backgroundLogger.warn('Content script not responding after injection');
      }
    } catch (error) {
      backgroundLogger.error('Failed to inject content script:', error);
      // Preserve original error message for specific error handling
      throw error;
    }
  }

  /**
   * Send activation message to content script
   */
  private async sendActivationMessage(
    tabId: number,
    data: ActivationData
  ): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'ACTIVATE_EXTENSION',
        data: { mode: data.mode, selectedIcon: data.selectedIcon },
      });
      backgroundLogger.debug('Activation message sent to content script');
    } catch (error) {
      backgroundLogger.error('Failed to send activation message:', error);
      throw error;
    }
  }
}

// Singleton instance
export const extensionLifecycleHandler = new ExtensionLifecycleHandler();
