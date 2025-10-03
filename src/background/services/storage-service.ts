/**
 * Storage management service for Chrome extension data
 * Extracted from background.ts for better code organization
 */

import { ExtensionSettings, JourneyState } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';

// Storage keys
const SETTINGS_KEY = 'settings';
const JOURNEY_STORAGE_KEY = 'journeyState';

/**
 * Storage management and synchronization service
 */
export class StorageService {
  /**
   * Get extension settings from storage
   */
  async getSettings(): Promise<{
    success: boolean;
    settings?: ExtensionSettings;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Getting extension settings');

      const result = await chrome.storage.sync.get(SETTINGS_KEY);
      const settings = result[SETTINGS_KEY];

      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = await this.getDefaultSettings();
        backgroundLogger.info('No settings found, returning defaults');

        return {
          success: true,
          settings: defaultSettings,
        };
      }

      backgroundLogger.debug('Retrieved settings:', settings);
      return {
        success: true,
        settings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to get settings:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update extension settings in storage
   */
  async updateSettings(settings: Partial<ExtensionSettings>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Updating extension settings:', settings);

      // Get existing settings first to merge with updates
      const currentResult = await this.getSettings();
      if (!currentResult.success || !currentResult.settings) {
        const defaultSettings = await this.getDefaultSettings();
        const mergedSettings = { ...defaultSettings, ...settings };

        await chrome.storage.sync.set({
          [SETTINGS_KEY]: mergedSettings,
        });
      } else {
        const mergedSettings = { ...currentResult.settings, ...settings };

        await chrome.storage.sync.set({
          [SETTINGS_KEY]: mergedSettings,
        });
      }

      backgroundLogger.info('Settings updated successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to update settings:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get journey state from storage
   */
  async getJourneyState(): Promise<{
    success: boolean;
    journeyState?: JourneyState;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Getting journey state');

      const result = await chrome.storage.local.get(JOURNEY_STORAGE_KEY);
      const journeyState = result[JOURNEY_STORAGE_KEY];

      if (!journeyState) {
        backgroundLogger.info('No journey state found in storage');
        return {
          success: true,
          journeyState: undefined,
        };
      }

      backgroundLogger.debug('Retrieved journey state:', {
        isActive: journeyState.isActive,
        screenshotCount: journeyState.screenshots?.length || 0,
        startTime: journeyState.startTime,
      });

      return {
        success: true,
        journeyState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to get journey state:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Save journey state to storage
   */
  async saveJourneyState(journeyState: JourneyState): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Saving journey state:', {
        isActive: journeyState.isActive,
        screenshotCount: journeyState.screenshots?.length || 0,
        startTime: journeyState.startTime,
        endTime: journeyState.endTime,
      });

      await chrome.storage.local.set({
        [JOURNEY_STORAGE_KEY]: journeyState,
      });

      backgroundLogger.info('Journey state saved successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to save journey state:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clear journey state from storage
   */
  async clearJourneyState(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.info('Clearing journey state');

      await chrome.storage.local.remove(JOURNEY_STORAGE_KEY);

      backgroundLogger.info('Journey state cleared successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to clear journey state:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    success: boolean;
    stats?: {
      syncUsed: number;
      syncQuota: number;
      syncUsagePercent: number;
      localUsed: number;
      localQuota: number;
      localUsagePercent: number;
    };
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Getting storage statistics');

      const [syncUsage, localUsage] = await Promise.all([
        chrome.storage.sync.getBytesInUse(),
        chrome.storage.local.getBytesInUse(),
      ]);

      // Chrome storage quotas
      const syncQuota = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB
      const localQuota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB

      const stats = {
        syncUsed: syncUsage,
        syncQuota,
        syncUsagePercent: (syncUsage / syncQuota) * 100,
        localUsed: localUsage,
        localQuota,
        localUsagePercent: (localUsage / localQuota) * 100,
      };

      backgroundLogger.debug('Storage statistics:', stats);
      return {
        success: true,
        stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to get storage statistics:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clear all extension data (for cleanup/reset)
   */
  async clearAllData(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.info('Clearing all extension data');

      await Promise.all([
        chrome.storage.sync.clear(),
        chrome.storage.local.clear(),
      ]);

      backgroundLogger.info('All extension data cleared successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to clear all data:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Export all extension data for backup
   */
  async exportData(): Promise<{
    success: boolean;
    data?: {
      settings: ExtensionSettings | null;
      journeyState: JourneyState | null;
      exportDate: string;
      version: string;
    };
    error?: string;
  }> {
    try {
      backgroundLogger.info('Exporting extension data');

      const [settingsResult, journeyResult] = await Promise.all([
        this.getSettings(),
        this.getJourneyState(),
      ]);

      const exportData = {
        settings: settingsResult.success ? settingsResult.settings || null : null,
        journeyState: journeyResult.success ? journeyResult.journeyState || null : null,
        exportDate: new Date().toISOString(),
        version: '1.0.0', // Extension version
      };

      backgroundLogger.info('Data export completed');
      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to export data:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Import extension data from backup
   */
  async importData(data: {
    settings?: ExtensionSettings;
    journeyState?: JourneyState;
  }): Promise<{
    success: boolean;
    imported?: {
      settings: boolean;
      journeyState: boolean;
    };
    error?: string;
  }> {
    try {
      backgroundLogger.info('Importing extension data:', {
        hasSettings: !!data.settings,
        hasJourneyState: !!data.journeyState,
      });

      const imported = {
        settings: false,
        journeyState: false,
      };

      // Import settings if provided
      if (data.settings) {
        const updateResult = await this.updateSettings(data.settings);
        imported.settings = updateResult.success;
      }

      // Import journey state if provided
      if (data.journeyState) {
        const saveResult = await this.saveJourneyState(data.journeyState);
        imported.journeyState = saveResult.success;
      }

      backgroundLogger.info('Data import completed:', imported);
      return {
        success: true,
        imported,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to import data:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get default extension settings
   */
  private async getDefaultSettings(): Promise<ExtensionSettings> {
    return {
      mode: 'snap',
      markerColor: {
        color: '#FF0000',
        opacity: 0.8,
        size: 32,
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
        confidenceThreshold: 0.7,
        interimResults: true,
        silenceTimeout: 2,
      },
    };
  }

  /**
   * Validate storage data integrity
   */
  async validateData(): Promise<{
    success: boolean;
    validation?: {
      settings: boolean;
      journeyState: boolean;
      issues: string[];
    };
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Validating storage data');

      const issues: string[] = [];
      let settingsValid = false;
      let journeyStateValid = false;

      // Validate settings
      const settingsResult = await this.getSettings();
      if (settingsResult.success && settingsResult.settings) {
        settingsValid = this.validateSettings(settingsResult.settings);
        if (!settingsValid) {
          issues.push('Invalid settings structure detected');
        }
      } else {
        issues.push('Could not retrieve settings for validation');
      }

      // Validate journey state
      const journeyResult = await this.getJourneyState();
      if (journeyResult.success && journeyResult.journeyState) {
        journeyStateValid = this.validateJourneyState(journeyResult.journeyState);
        if (!journeyStateValid) {
          issues.push('Invalid journey state structure detected');
        }
      } else {
        issues.push('Could not retrieve journey state for validation');
      }

      const validation = {
        settings: settingsValid,
        journeyState: journeyStateValid,
        issues,
      };

      backgroundLogger.info('Data validation completed:', validation);
      return {
        success: true,
        validation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to validate data:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate settings structure
   */
  private validateSettings(settings: ExtensionSettings): boolean {
    try {
      // Check required top-level properties
      const requiredProps = ['mode', 'markerColor', 'saveLocation', 'voice', 'text', 'transcription'];
      for (const prop of requiredProps) {
        if (!(prop in settings)) {
          backgroundLogger.warn(`Missing required settings property: ${prop}`);
          return false;
        }
      }

      // Validate mode
      if (!['snap', 'journey'].includes(settings.mode)) {
        backgroundLogger.warn('Invalid mode value:', settings.mode);
        return false;
      }

      // Validate markerColor structure
      const markerRequired = ['color', 'opacity', 'size', 'style'];
      for (const prop of markerRequired) {
        if (!(prop in settings.markerColor)) {
          backgroundLogger.warn(`Missing markerColor property: ${prop}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      backgroundLogger.warn('Settings validation error:', error);
      return false;
    }
  }

  /**
   * Validate journey state structure
   */
  private validateJourneyState(journeyState: JourneyState): boolean {
    try {
      // Check required properties
      const requiredProps = ['isActive', 'screenshots'];
      for (const prop of requiredProps) {
        if (!(prop in journeyState)) {
          backgroundLogger.warn(`Missing required journey state property: ${prop}`);
          return false;
        }
      }

      // Validate isActive is boolean
      if (typeof journeyState.isActive !== 'boolean') {
        backgroundLogger.warn('Invalid isActive type:', typeof journeyState.isActive);
        return false;
      }

      // Validate screenshots is array
      if (!Array.isArray(journeyState.screenshots)) {
        backgroundLogger.warn('Screenshots is not an array');
        return false;
      }

      return true;
    } catch (error) {
      backgroundLogger.warn('Journey state validation error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();