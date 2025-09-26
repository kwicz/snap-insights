/**
 * Settings and configuration management service
 * Extracted from background.ts for better code organization
 */

import { ExtensionSettings, ExtensionMode, MarkerColorSettings } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';
import { storageService } from './storage-service';
import { settingsValidator } from '../../shared/validation/settings-schema';
import { eventBus } from '../../shared/services/event-bus';

/**
 * Settings and extension configuration service
 */
export class SettingsService {
  /**
   * Handle settings update request
   */
  async handleSettingsUpdate(settingsUpdate: Partial<ExtensionSettings>): Promise<{
    success: boolean;
    error?: string;
    warnings?: string[];
  }> {
    try {
      backgroundLogger.debug('Handling settings update:', settingsUpdate);

      // Get current settings for comparison
      const currentResult = await storageService.getSettings();
      const currentSettings = currentResult.success ? currentResult.settings : undefined;

      // Validate and sanitize settings
      const validation = settingsValidator.validateExtensionSettings(settingsUpdate);
      if (!validation.isValid) {
        backgroundLogger.warn('Settings validation failed:', validation.errors);
        return {
          success: false,
          error: `Invalid settings: ${validation.errors.join(', ')}`,
        };
      }

      // Use sanitized settings if available
      const finalSettings = validation.sanitized || settingsUpdate;

      const result = await storageService.updateSettings(finalSettings);
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update settings',
        };
      }

      // Emit settings update event
      eventBus.emit('settings:updated', {
        oldSettings: currentSettings,
        newSettings: { ...currentSettings, ...finalSettings },
      });

      backgroundLogger.info('Settings update handled successfully');
      return {
        success: true,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to handle settings update:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current extension settings
   */
  async handleGetSettings(): Promise<{
    success: boolean;
    settings?: ExtensionSettings;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Getting extension settings');

      const result = await storageService.getSettings();
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get settings',
        };
      }

      backgroundLogger.debug('Retrieved settings successfully');
      return {
        success: true,
        settings: result.settings,
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
   * Toggle extension mode
   */
  async handleModeToggle(): Promise<{
    success: boolean;
    mode?: ExtensionMode;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Handling mode toggle');

      // Get current settings
      const settingsResult = await storageService.getSettings();
      if (!settingsResult.success || !settingsResult.settings) {
        return {
          success: false,
          error: 'Could not retrieve current settings',
        };
      }

      // Toggle mode
      const currentMode = settingsResult.settings.mode;
      const newMode: ExtensionMode = currentMode === 'snap' ? 'journey' : 'snap';

      // Update settings with new mode
      const updateResult = await storageService.updateSettings({ mode: newMode });
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || 'Failed to update mode',
        };
      }

      // Update extension badge to reflect new mode
      await this.updateBadgeForMode(newMode);

      backgroundLogger.info(`Mode toggled from ${currentMode} to ${newMode}`);
      return {
        success: true,
        mode: newMode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to toggle mode:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate settings object
   */
  validateSettings(settings: Partial<ExtensionSettings>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Validate mode if provided
      if (settings.mode && !['snap', 'journey'].includes(settings.mode)) {
        errors.push(`Invalid mode: ${settings.mode}. Must be 'snap' or 'journey'.`);
      }

      // Validate markerColor if provided
      if (settings.markerColor) {
        const marker = settings.markerColor;

        if (marker.color && !/^#([0-9A-F]{3}){1,2}$/i.test(marker.color)) {
          errors.push(`Invalid marker color: ${marker.color}. Must be a valid hex color.`);
        }

        if (marker.opacity !== undefined && (marker.opacity < 0 || marker.opacity > 1)) {
          errors.push(`Invalid marker opacity: ${marker.opacity}. Must be between 0 and 1.`);
        }

        if (marker.size !== undefined && (marker.size < 1 || marker.size > 100)) {
          errors.push(`Invalid marker size: ${marker.size}. Must be between 1 and 100.`);
        }

        if (marker.style && !['solid', 'dashed', 'dotted'].includes(marker.style)) {
          errors.push(`Invalid marker style: ${marker.style}. Must be 'solid', 'dashed', or 'dotted'.`);
        }
      }

      // Validate voice settings if provided
      if (settings.voice) {
        const voice = settings.voice;

        if (voice.maxDuration !== undefined && (voice.maxDuration < 1 || voice.maxDuration > 300)) {
          errors.push(`Invalid voice max duration: ${voice.maxDuration}. Must be between 1 and 300 seconds.`);
        }

        if (voice.quality && !['low', 'medium', 'high'].includes(voice.quality)) {
          errors.push(`Invalid voice quality: ${voice.quality}. Must be 'low', 'medium', or 'high'.`);
        }

        if (voice.language && !/^[a-z]{2}-[A-Z]{2}$/.test(voice.language)) {
          errors.push(`Invalid voice language: ${voice.language}. Must be in format 'xx-XX'.`);
        }
      }

      // Validate text settings if provided
      if (settings.text) {
        const text = settings.text;

        if (text.defaultFontSize !== undefined && (text.defaultFontSize < 8 || text.defaultFontSize > 72)) {
          errors.push(`Invalid font size: ${text.defaultFontSize}. Must be between 8 and 72.`);
        }

        if (text.defaultColor && !/^#([0-9A-F]{3}){1,2}$/i.test(text.defaultColor)) {
          errors.push(`Invalid text color: ${text.defaultColor}. Must be a valid hex color.`);
        }

        if (text.maxLength !== undefined && (text.maxLength < 1 || text.maxLength > 5000)) {
          errors.push(`Invalid text max length: ${text.maxLength}. Must be between 1 and 5000.`);
        }
      }

      // Validate transcription settings if provided
      if (settings.transcription) {
        const transcription = settings.transcription;

        if (transcription.language && !/^[a-z]{2}-[A-Z]{2}$/.test(transcription.language)) {
          errors.push(`Invalid transcription language: ${transcription.language}. Must be in format 'xx-XX'.`);
        }

        if (transcription.confidenceThreshold !== undefined &&
            (transcription.confidenceThreshold < 0 || transcription.confidenceThreshold > 1)) {
          errors.push(`Invalid confidence threshold: ${transcription.confidenceThreshold}. Must be between 0 and 1.`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      backgroundLogger.error('Settings validation error:', error);
      return {
        isValid: false,
        errors: ['Settings validation failed due to unexpected error'],
      };
    }
  }

  /**
   * Get marker settings for screenshot processing
   */
  async getMarkerSettings(): Promise<MarkerColorSettings> {
    try {
      const settingsResult = await storageService.getSettings();

      if (settingsResult.success && settingsResult.settings?.markerColor) {
        return settingsResult.settings.markerColor;
      }

      // Return default marker settings if not found
      return {
        color: '#FF0000',
        opacity: 0.8,
        size: 32,
        style: 'solid',
      };
    } catch (error) {
      backgroundLogger.warn('Failed to get marker settings, using defaults:', error);
      return {
        color: '#FF0000',
        opacity: 0.8,
        size: 32,
        style: 'solid',
      };
    }
  }

  /**
   * Reset settings to default values
   */
  async resetToDefaults(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.info('Resetting settings to defaults');

      const defaultSettings: ExtensionSettings = {
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

      // Clear current settings and set defaults
      await chrome.storage.sync.clear();
      const result = await storageService.updateSettings(defaultSettings);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to reset settings',
        };
      }

      // Update badge for default mode
      await this.updateBadgeForMode('snap');

      backgroundLogger.info('Settings reset to defaults successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to reset settings:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if settings migration is needed (for version updates)
   */
  async checkMigration(): Promise<{
    needed: boolean;
    fromVersion?: string;
    toVersion: string;
  }> {
    try {
      const settingsResult = await storageService.getSettings();
      const currentVersion = '1.0.0'; // Current extension version

      if (!settingsResult.success || !settingsResult.settings) {
        // No settings exist, migration not needed (fresh install)
        return {
          needed: false,
          toVersion: currentVersion,
        };
      }

      // Check if version field exists in settings (added in later versions)
      const settings = settingsResult.settings as any;
      const settingsVersion = settings.version || '0.9.0'; // Assume old version if not present

      const migrationNeeded = settingsVersion !== currentVersion;

      backgroundLogger.debug('Migration check:', {
        current: currentVersion,
        stored: settingsVersion,
        needed: migrationNeeded,
      });

      return {
        needed: migrationNeeded,
        fromVersion: settingsVersion,
        toVersion: currentVersion,
      };
    } catch (error) {
      backgroundLogger.warn('Migration check failed:', error);
      return {
        needed: false,
        toVersion: '1.0.0',
      };
    }
  }

  /**
   * Perform settings migration if needed
   */
  async performMigration(fromVersion: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.info(`Performing settings migration from ${fromVersion} to 1.0.0`);

      const settingsResult = await storageService.getSettings();
      if (!settingsResult.success || !settingsResult.settings) {
        return {
          success: false,
          error: 'Could not retrieve settings for migration',
        };
      }

      let migratedSettings = { ...settingsResult.settings };

      // Version-specific migrations
      if (fromVersion === '0.9.0') {
        // Add new fields that didn't exist in 0.9.0
        migratedSettings = {
          ...migratedSettings,
          // Add any new settings with defaults
        };
      }

      // Save migrated settings
      const updateResult = await storageService.updateSettings(migratedSettings);
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || 'Failed to save migrated settings',
        };
      }

      backgroundLogger.info(`Settings migration completed successfully`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Settings migration failed:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update extension badge based on mode
   */
  private async updateBadgeForMode(mode: ExtensionMode): Promise<void> {
    try {
      switch (mode) {
        case 'snap':
          await chrome.action.setBadgeText({ text: '' });
          await chrome.action.setTitle({ title: 'SnapInsights - Snap Mode' });
          break;
        case 'journey':
          await chrome.action.setBadgeText({ text: 'J' });
          await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
          await chrome.action.setTitle({ title: 'SnapInsights - Journey Mode' });
          break;
      }
    } catch (error) {
      backgroundLogger.warn('Failed to update badge for mode:', error);
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();