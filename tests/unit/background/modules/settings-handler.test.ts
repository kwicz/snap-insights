/**
 * Tests for settings handler
 */

import { settingsHandler } from '@/background/modules/settings-handler';
import { STORAGE_KEYS, EXTENSION_MODES } from '@/shared/constants/app-constants';

describe('SettingsHandler', () => {
  const mockSettings = {
    mode: 'snap',
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    chrome.storage.sync.get = jest.fn().mockResolvedValue({
      [STORAGE_KEYS.SETTINGS]: mockSettings,
    });
    chrome.storage.sync.set = jest.fn().mockResolvedValue(undefined);
    chrome.storage.local.get = jest.fn().mockResolvedValue({
      [STORAGE_KEYS.CURRENT_MODE]: 'snap',
    });
    chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
    chrome.storage.local.getBytesInUse = jest.fn().mockResolvedValue(1024);
    chrome.storage.sync.getBytesInUse = jest.fn().mockResolvedValue(512);
    chrome.storage.sync.QUOTA_BYTES = 102400;
    chrome.storage.local.QUOTA_BYTES = 5242880;
  });

  describe('handleGetSettings', () => {
    test('should return settings successfully', async () => {
      const result = await settingsHandler.handleGetSettings();
      
      expect(result.success).toBe(true);
      expect(result.settings).toEqual(mockSettings);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(STORAGE_KEYS.SETTINGS);
    });

    test('should handle missing settings', async () => {
      chrome.storage.sync.get = jest.fn().mockResolvedValue({});
      
      const result = await settingsHandler.handleGetSettings();
      
      expect(result.success).toBe(true);
      expect(result.settings).toBeDefined();
    });

    test('should handle storage errors', async () => {
      chrome.storage.sync.get = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(settingsHandler.handleGetSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('handleSettingsUpdate', () => {
    test('should update settings successfully', async () => {
      const updates = { mode: 'annotate' };
      
      await settingsHandler.handleSettingsUpdate(updates);
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.SETTINGS]: { ...mockSettings, ...updates },
      });
    });

    test('should handle partial updates', async () => {
      const updates = {
        markerColor: { color: '#00FF00' },
        voice: { enabled: false },
      };
      
      await settingsHandler.handleSettingsUpdate(updates);
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.SETTINGS]: {
          ...mockSettings,
          markerColor: { ...mockSettings.markerColor, color: '#00FF00' },
          voice: { ...mockSettings.voice, enabled: false },
        },
      });
    });

    test('should handle storage errors', async () => {
      chrome.storage.sync.set = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(settingsHandler.handleSettingsUpdate({ mode: 'annotate' }))
        .rejects.toThrow('Storage error');
    });
  });

  describe('handleModeToggle', () => {
    test('should toggle from snap to annotate', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        [STORAGE_KEYS.CURRENT_MODE]: 'snap',
      });
      
      const result = await settingsHandler.handleModeToggle();
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('annotate');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.CURRENT_MODE]: 'annotate',
      });
    });

    test('should toggle from annotate to transcribe', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        [STORAGE_KEYS.CURRENT_MODE]: 'annotate',
      });
      
      const result = await settingsHandler.handleModeToggle();
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('transcribe');
    });

    test('should toggle from transcribe to snap', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        [STORAGE_KEYS.CURRENT_MODE]: 'transcribe',
      });
      
      const result = await settingsHandler.handleModeToggle();
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('snap');
    });

    test('should handle missing current mode', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({});
      
      const result = await settingsHandler.handleModeToggle();
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('annotate'); // Default next mode from snap
    });

    test('should handle invalid current mode', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        [STORAGE_KEYS.CURRENT_MODE]: 'invalid',
      });
      
      const result = await settingsHandler.handleModeToggle();
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('annotate'); // Default next mode
    });

    test('should handle storage errors', async () => {
      chrome.storage.local.get = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(settingsHandler.handleModeToggle()).rejects.toThrow('Storage error');
    });
  });

  describe('handleGetStorageStats', () => {
    test('should return storage statistics', async () => {
      const result = await settingsHandler.handleGetStorageStats();
      
      expect(result.success).toBe(true);
      expect(result.stats).toEqual({
        local: {
          used: 1024,
          quota: 5242880,
          percentage: (1024 / 5242880) * 100,
        },
        sync: {
          used: 512,
          quota: 102400,
          percentage: (512 / 102400) * 100,
        },
      });
    });

    test('should handle missing quota constants', async () => {
      delete (chrome.storage.sync as any).QUOTA_BYTES;
      delete (chrome.storage.local as any).QUOTA_BYTES;
      
      const result = await settingsHandler.handleGetStorageStats();
      
      expect(result.success).toBe(true);
      expect(result.stats.sync.quota).toBe(102400); // Default fallback
      expect(result.stats.local.quota).toBe(5242880); // Default fallback
    });

    test('should handle storage errors', async () => {
      chrome.storage.local.getBytesInUse = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(settingsHandler.handleGetStorageStats()).rejects.toThrow('Storage error');
    });
  });

  describe('handleResetSettings', () => {
    test('should reset settings to defaults', async () => {
      await settingsHandler.handleResetSettings();
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.SETTINGS]: expect.objectContaining({
          mode: 'snap',
          markerColor: expect.any(Object),
          saveLocation: expect.any(Object),
          voice: expect.any(Object),
          text: expect.any(Object),
          transcription: expect.any(Object),
        }),
      });
    });

    test('should handle storage errors', async () => {
      chrome.storage.sync.set = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(settingsHandler.handleResetSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('handleExportSettings', () => {
    test('should export settings successfully', async () => {
      const result = await settingsHandler.handleExportSettings();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        settings: mockSettings,
        exportDate: expect.any(String),
        version: expect.any(String),
      });
    });

    test('should handle storage errors', async () => {
      chrome.storage.sync.get = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await expect(settingsHandler.handleExportSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('handleImportSettings', () => {
    test('should import settings successfully', async () => {
      const importData = {
        settings: { mode: 'annotate' },
        version: '1.0.0',
      };
      
      await settingsHandler.handleImportSettings(importData);
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.SETTINGS]: expect.objectContaining({
          mode: 'annotate',
        }),
      });
    });

    test('should handle invalid import data', async () => {
      await expect(settingsHandler.handleImportSettings({}))
        .rejects.toThrow('Invalid import data');
    });

    test('should handle storage errors', async () => {
      chrome.storage.sync.set = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const importData = {
        settings: { mode: 'annotate' },
        version: '1.0.0',
      };
      
      await expect(settingsHandler.handleImportSettings(importData))
        .rejects.toThrow('Storage error');
    });
  });

  describe('validateSettings', () => {
    test('should validate correct settings', () => {
      const isValid = (settingsHandler as any).validateSettings(mockSettings);
      expect(isValid).toBe(true);
    });

    test('should reject invalid settings', () => {
      const invalidSettings = { mode: 'invalid' };
      const isValid = (settingsHandler as any).validateSettings(invalidSettings);
      expect(isValid).toBe(false);
    });

    test('should handle missing required fields', () => {
      const incompleteSettings = { mode: 'snap' };
      const isValid = (settingsHandler as any).validateSettings(incompleteSettings);
      expect(isValid).toBe(false);
    });
  });

  describe('mergeSettings', () => {
    test('should merge settings correctly', () => {
      const updates = {
        mode: 'annotate',
        markerColor: { color: '#00FF00' },
      };
      
      const merged = (settingsHandler as any).mergeSettings(mockSettings, updates);
      
      expect(merged.mode).toBe('annotate');
      expect(merged.markerColor.color).toBe('#00FF00');
      expect(merged.markerColor.opacity).toBe(0.8); // Preserved from original
    });
  });
});