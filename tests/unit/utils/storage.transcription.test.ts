import { fileStorageManager } from '@/utils/storage';
import { TranscriptionPreferences } from '@/types';

// Mock chrome.storage.local
const mockChromeStorage = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
};

// Mock chrome.storage
(global as any).chrome = {
  storage: {
    local: mockChromeStorage,
  },
};

describe('Storage - Transcription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveTranscriptionSettings', () => {
    it('saves transcription settings correctly', async () => {
      const mockSettings: TranscriptionPreferences = {
        enabled: true,
        language: 'en-US',
        maxDuration: 300,
        confidenceThreshold: 0.8,
        interimResults: true,
        silenceTimeout: 2,
      };

      // Mock existing settings
      mockChromeStorage.get.mockResolvedValue({
        settings: {
          mode: 'transcribe',
          text: { maxLength: 500 },
        },
      });

      await fileStorageManager.saveTranscriptionSettings(mockSettings);

      // Verify storage.set was called with merged settings
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        settings: {
          mode: 'transcribe',
          text: { maxLength: 500 },
          transcription: mockSettings,
        },
      });
    });

    it('handles missing existing settings', async () => {
      const mockSettings: TranscriptionPreferences = {
        enabled: true,
        language: 'en-US',
        maxDuration: 300,
        confidenceThreshold: 0.8,
        interimResults: true,
        silenceTimeout: 2,
      };

      // Mock no existing settings
      mockChromeStorage.get.mockResolvedValue({});

      await fileStorageManager.saveTranscriptionSettings(mockSettings);

      // Verify storage.set was called with new settings
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        settings: {
          transcription: mockSettings,
        },
      });
    });

    it('handles storage errors', async () => {
      const mockSettings: TranscriptionPreferences = {
        enabled: true,
        language: 'en-US',
        maxDuration: 300,
        confidenceThreshold: 0.8,
        interimResults: true,
        silenceTimeout: 2,
      };

      // Mock storage error
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      await expect(
        fileStorageManager.saveTranscriptionSettings(mockSettings)
      ).rejects.toThrow('Storage error');
    });
  });

  describe('getTranscriptionSettings', () => {
    it('retrieves transcription settings correctly', async () => {
      const mockSettings: TranscriptionPreferences = {
        enabled: true,
        language: 'en-US',
        maxDuration: 300,
        confidenceThreshold: 0.8,
        interimResults: true,
        silenceTimeout: 2,
      };

      mockChromeStorage.get.mockResolvedValue({
        settings: {
          transcription: mockSettings,
        },
      });

      const settings = await fileStorageManager.getTranscriptionSettings();
      expect(settings).toEqual(mockSettings);
    });

    it('returns null when no settings exist', async () => {
      mockChromeStorage.get.mockResolvedValue({});

      const settings = await fileStorageManager.getTranscriptionSettings();
      expect(settings).toBeNull();
    });

    it('handles storage errors gracefully', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      const settings = await fileStorageManager.getTranscriptionSettings();
      expect(settings).toBeNull();
    });
  });

  describe('cleanupTranscriptionData', () => {
    it('removes transcription data for all screenshots', async () => {
      const mockScreenshots = [
        { downloadId: 1, transcription: { language: 'en-US' } },
        { downloadId: 2, transcription: { language: 'fr-FR' } },
        { downloadId: 3 }, // No transcription
      ];

      // Mock getAllScreenshots to return test data
      jest
        .spyOn(fileStorageManager, 'getAllScreenshots')
        .mockResolvedValue(mockScreenshots);

      await fileStorageManager.cleanupTranscriptionData();

      // Verify correct keys were removed
      expect(mockChromeStorage.remove).toHaveBeenCalledWith([
        'transcription_1',
        'transcription_2',
      ]);
    });

    it('handles empty screenshot list', async () => {
      jest.spyOn(fileStorageManager, 'getAllScreenshots').mockResolvedValue([]);

      await fileStorageManager.cleanupTranscriptionData();

      // Verify remove was not called
      expect(mockChromeStorage.remove).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      jest
        .spyOn(fileStorageManager, 'getAllScreenshots')
        .mockRejectedValue(new Error('Failed to get screenshots'));

      await fileStorageManager.cleanupTranscriptionData();

      // Verify remove was not called
      expect(mockChromeStorage.remove).not.toHaveBeenCalled();
    });
  });

  describe('saveOptimizedMetadata', () => {
    it('includes transcription metadata when saving screenshots', async () => {
      const mockScreenshotData = {
        dataUrl: 'data:image/png;base64,test',
        url: 'https://example.com',
        timestamp: Date.now(),
        coordinates: { x: 100, y: 100 },
      };

      const mockTranscriptionSettings = {
        enabled: true,
        language: 'en-US',
        maxDuration: 300,
        confidenceThreshold: 0.8,
        interimResults: true,
        silenceTimeout: 2,
      };

      // Mock settings retrieval
      mockChromeStorage.get.mockResolvedValue({
        settings: {
          transcription: mockTranscriptionSettings,
        },
      });

      // Call private method through a public method that uses it
      await fileStorageManager.saveScreenshot(mockScreenshotData);

      // Verify metadata was saved with transcription info
      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [`metadata_1`]: expect.objectContaining({
            transcription: {
              language: 'en-US',
              confidence: 0.8,
              duration: 300,
            },
          }),
        })
      );
    });
  });
});
