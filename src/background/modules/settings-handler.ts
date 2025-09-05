/**
 * Settings management handler for background script
 */

import { STORAGE_KEYS, EXTENSION_MODES } from '@/shared/constants/app-constants';
import { extensionLifecycleHandler } from './extension-lifecycle';
import { backgroundLogger } from '@/utils/debug-logger';
import { ExtensionError, ExtensionSettings, ExtensionMode } from '@/types';

/**
 * Handler for extension settings operations
 */
export class SettingsHandler {
  /**
   * Update extension settings
   */
  async handleSettingsUpdate(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      backgroundLogger.debug('Updating settings', settings);

      // Get current settings
      const { settings: currentSettings } = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);

      // Update settings
      const newSettings = { ...currentSettings, ...settings };
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: newSettings });

      // Update badge if mode changed
      if (settings.mode) {
        await extensionLifecycleHandler.updateBadge(settings.mode);
      }

      backgroundLogger.info('Settings updated successfully', newSettings);

    } catch (error) {
      backgroundLogger.error('Failed to update settings:', error);
      throw new ExtensionError(
        'Failed to update settings',
        'storage',
        'settings_error',
        { originalError: error }
      );
    }
  }

  /**
   * Get current extension settings
   */
  async handleGetSettings(): Promise<{ settings: ExtensionSettings }> {
    try {
      const { settings } = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);

      // Return default settings if none exist
      if (!settings) {
        const defaultSettings = this.getDefaultSettings();
        await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: defaultSettings });
        backgroundLogger.info('Created default settings');
        return { settings: defaultSettings };
      }

      backgroundLogger.debug('Retrieved settings', settings);
      return { settings };

    } catch (error) {
      backgroundLogger.error('Failed to get settings:', error);
      throw new ExtensionError(
        'Failed to get settings',
        'storage',
        'get_settings_error',
        { originalError: error }
      );
    }
  }

  /**
   * Get storage statistics
   */
  async handleGetStorageStats(): Promise<{
    stats: { totalScreenshots: number; lastSaved: number | null };
  }> {
    try {
      const { screenshots, stats } = await chrome.storage.local.get([
        STORAGE_KEYS.SCREENSHOTS,
        STORAGE_KEYS.STATS,
      ]);

      const totalScreenshots = screenshots ? Object.keys(screenshots).length : 0;
      const lastSaved = stats?.lastSaved || null;

      const result = {
        stats: {
          totalScreenshots,
          lastSaved,
        },
      };

      backgroundLogger.debug('Retrieved storage stats', result);
      return result;

    } catch (error) {
      backgroundLogger.error('Failed to get storage stats:', error);
      throw new ExtensionError(
        'Failed to get storage stats',
        'storage',
        'get_stats_error',
        { originalError: error }
      );
    }
  }

  /**
   * Toggle between screenshot and annotation modes
   */
  async handleModeToggle(): Promise<{ mode: ExtensionMode }> {
    try {
      backgroundLogger.debug('Toggling mode');

      // Get current settings
      const { settings } = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      const currentMode = settings?.mode || EXTENSION_MODES.SNAP;

      // Toggle mode
      const newMode: ExtensionMode = currentMode === EXTENSION_MODES.SNAP 
        ? EXTENSION_MODES.ANNOTATE as ExtensionMode
        : EXTENSION_MODES.SNAP as ExtensionMode;

      // Update settings
      await this.handleSettingsUpdate({ mode: newMode });

      backgroundLogger.info('Mode toggled', { from: currentMode, to: newMode });
      return { mode: newMode };

    } catch (error) {
      backgroundLogger.error('Failed to toggle mode:', error);
      throw new ExtensionError(
        'Failed to toggle mode',
        'operation',
        'toggle_error',
        { originalError: error }
      );
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      backgroundLogger.debug('Resetting settings to defaults');

      const defaultSettings = this.getDefaultSettings();
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: defaultSettings });

      backgroundLogger.info('Settings reset to defaults');

    } catch (error) {
      backgroundLogger.error('Failed to reset settings:', error);
      throw new ExtensionError(
        'Failed to reset settings',
        'storage',
        'reset_error',
        { originalError: error }
      );
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): ExtensionSettings {
    return {
      mode: EXTENSION_MODES.SNAP as ExtensionMode,
      markerColor: {
        color: '#FF0000',
        opacity: 0.8,
        size: 20,
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
  }
}

// Singleton instance
export const settingsHandler = new SettingsHandler();